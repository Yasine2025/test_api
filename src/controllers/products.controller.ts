// src/controllers/products.controller.ts
import type { Request, Response } from 'express';
import pool from '../config/db.js';
import type { RowDataPacket } from 'mysql2';

/**
 * GET /api/v1/products
 * Liste tous les produits
 */
export async function getAllProducts(req: Request, res: Response) {
  try {
    const { 
      category, 
      brand, 
      min_price, 
      max_price, 
      min_rating,
      page = '1', 
      limit = '50' 
    } = req.query;

    let query = `
      SELECT 
        p.*,
        (SELECT JSON_ARRAYAGG(
          JSON_OBJECT('name', spec_name, 'value', spec_value, 'category', spec_category)
        ) FROM amazon_product_specs s WHERE s.asin = p.asin) as specs,
        (SELECT JSON_ARRAYAGG(
          JSON_OBJECT(
            'user_name', user_name, 'title', title, 'content', content, 
            'rating', rating, 'verified_purchase', verified_purchase
          )
        ) FROM amazon_product_reviews r WHERE r.asin = p.asin LIMIT 5) as top_reviews,
        (SELECT JSON_OBJECT(
          'price', price, 'shipping_fee_amount', shipping_fee_amount,
          'has_stock', has_stock, 'seller_name', seller_name, 'is_prime', is_prime
        ) FROM amazon_buybox_offers o WHERE o.asin = p.asin AND o.is_buybox = TRUE LIMIT 1) as buybox_offer
      FROM amazon_products p
      WHERE 1=1
    `;

    const params: any[] = [];

    // Filtres
    if (category) {
      query += ' AND p.primary_category = ?';
      params.push(category);
    }

    if (brand) {
      query += ' AND p.brand_name = ?';
      params.push(brand);
    }

    if (min_price) {
      query += ' AND p.price >= ?';
      params.push(parseFloat(min_price as string));
    }

    if (max_price) {
      query += ' AND p.price <= ?';
      params.push(parseFloat(max_price as string));
    }

    if (min_rating) {
      query += ' AND p.rating_average >= ?';
      params.push(parseFloat(min_rating as string));
    }

    // Pagination
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    query += ' ORDER BY p.updated_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit as string), offset);

    const startTime = Date.now();
    const [products] = await pool.query<RowDataPacket[]>(query, params);
    const responseTime = ((Date.now() - startTime) / 1000).toFixed(2);

    // Formater la réponse au format Amazon
    const formattedProducts = products.map((p: any) => ({
      data: {
        is_valid_product: p.is_valid_product,
        asin: p.asin,
        marketplace_country_code: p.marketplace_country_code,
        marketplace_code: p.marketplace_code,
        parent_asin: p.parent_asin,
        title: p.title,
        description: p.description,
        main_image_url: p.main_image_url,
        images: p.images,
        brand: p.brand_name ? { name: p.brand_name } : null,
        price: p.price,
        has_stock: p.has_stock,
        rating_average: p.rating_average,
        review_count: p.review_count,
        rating_overview: p.rating_overview,
        sales_ranks: p.sales_ranks,
        specs: p.specs,
        top_reviews: p.top_reviews,
        buybox_offer: p.buybox_offer,
        categories: p.categories,
        is_prime: p.is_prime,
        is_amazonchoice: p.is_amazonchoice,
        updated_at: p.updated_at,
      },
    }));

    res.json({
      success: true,
      data: formattedProducts,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: products.length,
      },
      metadata: {
        response_time_taken: parseFloat(responseTime),
      },
    });

  } catch (error: any) {
    console.error('❌ Error fetching products:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * GET /api/v1/products/:asin
 * Récupérer un produit spécifique
 */
export async function getProductByAsin(req: Request, res: Response) {
  try {
    const { asin } = req.params;

    const query = `
      SELECT 
        p.*,
        (SELECT JSON_ARRAYAGG(
          JSON_OBJECT('name', spec_name, 'value', spec_value, 'category', spec_category)
        ) FROM amazon_product_specs s WHERE s.asin = p.asin) as specs,
        (SELECT JSON_ARRAYAGG(
          JSON_OBJECT(
            'marketplace_review_id', marketplace_review_id,
            'user_id', user_id,
            'user_name', user_name,
            'title', title,
            'content', content,
            'rating', rating,
            'review_meta_text', review_meta_text,
            'verified_purchase', verified_purchase,
            'helpful_count', helpful_count
          )
        ) FROM amazon_product_reviews r WHERE r.asin = p.asin ORDER BY r.helpful_count DESC LIMIT 10) as top_reviews,
        (SELECT JSON_OBJECT(
          'marketplace_offer_id', marketplace_offer_id,
          'price', price,
          'shipping_fee_amount', shipping_fee_amount,
          'has_stock', has_stock,
          'stock', stock,
          'condition', offer_condition,
          'min_order_quantity', min_order_quantity,
          'max_order_quantity', max_order_quantity,
          'primary_delivery_date_text', primary_delivery_date_text,
          'secondary_delivery_date_text', secondary_delivery_date_text,
          'is_buybox', is_buybox,
          'is_prime', is_prime,
          'is_fba', is_fba,
          'is_sba', is_sba,
          'seller', JSON_OBJECT('name', seller_name, 'marketplace_seller_id', seller_id)
        ) FROM amazon_buybox_offers o WHERE o.asin = p.asin AND o.is_buybox = TRUE LIMIT 1) as buybox_offer,
        (SELECT JSON_OBJECT(
          'name', brand_name,
          'marketplace_country_code', marketplace_country_code,
          'marketplace_node_id', marketplace_node_id,
          'url', brand_url
        ) FROM amazon_brand_info b WHERE b.brand_name = p.brand_name LIMIT 1) as brand
      FROM amazon_products p
      WHERE p.asin = ?
    `;

    const startTime = Date.now();
    const [products] = await pool.query<RowDataPacket[]>(query, [asin]);
    const responseTime = ((Date.now() - startTime) / 1000).toFixed(2);

    // ✅ CORRECTION ICI : Vérifier si products est vide AVANT d'accéder à products[0]
    if (!products || products.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
        message: `No product found with ASIN: ${asin}`,
      });
    }

    // ✅ MAINTENANT TypeScript sait que products[0] existe
    const product = products[0]!; // Le "!" dit à TypeScript qu'on est sûr que ça existe

    // Formater au format Amazon exact
    res.json({
      data: {
        is_valid_product: product.is_valid_product,
        asin: product.asin,
        marketplace_country_code: product.marketplace_country_code,
        marketplace_code: product.marketplace_code,
        shipping_country_code: product.shipping_country_code,
        shipping_location_code: product.shipping_location_code,
        platform_product_id: product.platform_product_id,
        marketplace_product_id: product.marketplace_product_id,
        updated_at: product.updated_at,
        parent_asin: product.parent_asin,
        current_asin: product.current_asin,
        landing_asin: product.landing_asin,
        upc: product.upc,
        ean: product.ean,
        title: product.title,
        description: product.description,
        main_image_url: product.main_image_url,
        images: product.images,
        videos: product.videos,
        url: `https://www.amazon.com/dp/${product.asin}`,
        is_climate_pledge_friendly: product.is_climate_pledge_friendly,
        has_proposition_65_warning: product.has_proposition_65_warning,
        is_frequently_returned_item: product.is_frequently_returned_item,
        is_limited_time_deal: product.is_limited_time_deal,
        product_dimensions_text: product.product_dimensions_text,
        product_dimensions: product.product_dimensions,
        package_dimensions_text: product.package_dimensions_text,
        package_dimensions: product.package_dimensions,
        specs: product.specs,
        review_count: product.review_count,
        rating_average: product.rating_average,
        rating_overview: product.rating_overview,
        answered_questions_count: product.answered_questions_count,
        reviews_ai_summary: product.reviews_ai_summary,
        has_a_plus_content: product.has_a_plus_content,
        has_brand_story: product.has_brand_story,
        is_prime: product.is_prime,
        is_amazonchoice: product.is_amazonchoice,
        has_buybox: product.has_buybox,
        brand: product.brand,
        categories: product.categories,
        sales_ranks: product.sales_ranks,
        buybox_offer: product.buybox_offer,
        top_reviews: product.top_reviews,
      },
      metadata: {
        credits_spent: 1,
        response_time_taken: parseFloat(responseTime),
      },
    });

  } catch (error: any) {
    console.error('❌ Error fetching product:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * PATCH /api/v1/products/:asin/price
 * Simuler un changement de prix
 */
export async function updateProductPrice(req: Request, res: Response) {
  try {
    const { asin } = req.params;
    const { price } = req.body;

    if (!price || isNaN(parseFloat(price))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid price',
        message: 'Please provide a valid numeric price',
      });
    }

    await pool.query(
      'UPDATE amazon_products SET price = ?, updated_at = NOW() WHERE asin = ?',
      [parseFloat(price), asin]
    );

    await pool.query(
      'UPDATE amazon_buybox_offers SET price = ?, updated_at = NOW() WHERE asin = ?',
      [parseFloat(price), asin]
    );

    res.json({
      success: true,
      message: 'Price updated successfully',
      data: {
        asin,
        new_price: parseFloat(price),
        updated_at: new Date().toISOString(),
      },
    });

  } catch (error: any) {
    console.error('❌ Error updating price:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}