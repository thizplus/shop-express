// services/warehousePriceService.ts
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();


interface WarehousePriceResponse {
  items: {
    sku: string;
    listPrice: {
      priceId: string;
      priceName: string;
      price: number;
    }[];
  }[];
  totalItems: number;
  currentPage: number;
  totalPages: number;
}

export const fetchWarehousePrices = async (): Promise<WarehousePriceResponse | null> => {
  try {
    const warehouseUrl = process.env.STORE_API_URL;
    const shopCode = process.env.SHOP_NAME;
    
    if (!warehouseUrl || !shopCode) {
      console.error('Missing STORE_API_URL or SHOP_NAME in environment variables');
      return null;
    }

    console.log(`Fetching warehouse prices from: ${warehouseUrl}/api/shops/${shopCode}/products`);

    const response = await axios.get<WarehousePriceResponse>(
      `${warehouseUrl}/api/shops/${shopCode}/products`
    );
    
    console.log('Warehouse response:', response.data);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Axios error fetching warehouse prices:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
    } else {
      console.error('Error fetching warehouse prices:', error);
    }
    return null;
  }
};