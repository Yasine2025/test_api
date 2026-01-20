// src/routes/products.routes.ts
import express from 'express';
import { getAllProducts, getProductByAsin, updateProductPrice, } from '../controllers/products.controller.js';
const router = express.Router();
// Routes publiques (sans authentification)
router.get('/products', getAllProducts);
router.get('/products/:asin', getProductByAsin);
router.patch('/products/:asin/price', updateProductPrice);
export default router;
//# sourceMappingURL=products.routes.js.map