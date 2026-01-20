import type { Request, Response } from 'express';
/**
 * GET /api/v1/products
 * Liste tous les produits
 */
export declare function getAllProducts(req: Request, res: Response): Promise<void>;
/**
 * GET /api/v1/products/:asin
 * Récupérer un produit spécifique
 */
export declare function getProductByAsin(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
/**
 * PATCH /api/v1/products/:asin/price
 * Simuler un changement de prix
 */
export declare function updateProductPrice(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=products.controller.d.ts.map