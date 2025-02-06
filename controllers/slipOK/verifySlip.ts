import { Request, Response } from 'express';
import axios from 'axios';

export const verifySlip = async (req: Request, res: Response) => {
  console.log('Received verify slip request:', req.body);
  const { url, amount, slipokApiKey, slipokApiUrl } = req.body;

  if (!url || !amount || !slipokApiKey || !slipokApiUrl) {
    console.error('Missing required data:', { url, amount, slipokApiKey, slipokApiUrl });
    return res.status(400).json({ status: 'error', message: 'ข้อมูลไม่ครบถ้วน' });
  }

  try {
    const verifyData = {
      url,
      log: true
    };

    console.log('Sending request to SlipOK API:', {
      url: slipokApiUrl,
      data: verifyData,
      headers: { 'Content-Type': 'application/json', 'x-authorization': '********' }
    });

    const verifyResponse = await axios.post(slipokApiUrl, verifyData, {
      headers: {
        'Content-Type': 'application/json',
        'x-authorization': slipokApiKey
      }
    });

    console.log('SlipOK API response:', verifyResponse.data);

    // ตรวจสอบโครงสร้างการตอบกลับใหม่
    if (verifyResponse.data.success && verifyResponse.data.data.success) {


      return res.status(200).json({
        status: 'success',
        message: verifyResponse.data.data.message || 'สลิปถูกต้อง',
        data: verifyResponse.data.data
      });
    } else {

      return res.status(400).json({
        status: 'error',
        message: verifyResponse.data.data?.message || 'ไม่สามารถยืนยันสลิปได้',
        data: verifyResponse.data.data
      });
    }
  } catch (error) {
    console.error('Error verifying slip:', error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('SlipOK API error response:', error.response.data);
      return res.status(error.response.status).json({
        status: 'error',
        message: error.response.data.message || 'SlipOK API returned an error',
        apiError: error.response.data
      });
    }
    return res.status(500).json({ status: 'error', message: 'เกิดข้อผิดพลาดในการตรวจสอบสลิป' });
  }
};