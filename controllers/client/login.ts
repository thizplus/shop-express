import { Request, Response } from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import StoreConfig from '../../models/configStore';
import Client, { IClient } from '../../models/clientModel';


export const verifyProfile = async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    console.error('No authorization header');
    return res.status(401).json({ message: 'No authorization header' });
  }

  const token = authHeader.split(' ')[1];
  const profile = req.body; // LIFF profile data

  try {
    // First, try to verify as a LIFF access token
    try {
      const verifyResponse = await axios.get('https://api.line.me/oauth2/v2.1/verify', {
        params: {
          access_token: token
        }
      });

      // Token is valid, find or create user
      let client = await Client.findOne({ userId: profile.userId });
      if (!client) {
        // Create new user with provided type
        client = new Client({
          userId: profile.userId,
          displayName: profile.displayName,
          pictureUrl: profile.pictureUrl,
          userType: profile.userType || 'store',
          idType: profile.idType || 'store',
          customPrices: [], // Initialize empty custom prices array
          enableGrabDelivery: false
        });
      } else {
        // Update existing user's basic info
        client.displayName = profile.displayName;
        client.pictureUrl = profile.pictureUrl;

        // Update user type only for valid contexts
        if (profile.userType === 'store' || profile.userType === 'wholesale') {
          client.userType = profile.userType;
          client.idType = profile.idType || 'store';
        }

        // Ensure customPrices exists
        if (!client.customPrices) {
          client.customPrices = [];
        }
      }
      await client.save();

      // Return full client data including customPrices
      return res.json({
        userId: client.userId,
        displayName: client.displayName,
        pictureUrl: client.pictureUrl,
        userType: client.userType,
        idType: client.idType,
        customPrices: client.customPrices || [], // Always include customPrices
        enableGrabDelivery: client.enableGrabDelivery || false,
        createdAt: client.createdAt // เพิ่มส่วนนี้
      });

    } catch (liffError) {
      console.log('Not a valid LIFF token, trying JWT...', liffError);
    }

    // If LIFF verification fails, try as JWT
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined');
    }

    const decoded = jwt.verify(token, jwtSecret) as { userId: string };
    const client = await Client.findOne({ userId: decoded.userId });

    if (!client) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Return full client data including customPrices for JWT auth as well
    res.json({
      userId: client.userId,
      displayName: client.displayName,
      pictureUrl: client.pictureUrl,
      userType: client.userType,
      idType: client.idType,
      customPrices: client.customPrices || [], // Always include customPrices
      enableGrabDelivery: client.enableGrabDelivery || false
    });

  } catch (error) {
    console.error('Verification error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
};

export const verifyToken = async (req: Request, res: Response) => {
  console.log('Verifying token');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ valid: false, message: 'No authorization header' });
  }

  const token = authHeader.split(' ')[1];
  const { userType, idType } = req.body; // Get context from request body

  try {
    // First try as LIFF token
    try {
      const verifyResponse = await axios.get('https://api.line.me/oauth2/v2.1/verify', {
        params: {
          access_token: token
        }
      });

      console.log('LIFF token verified:', verifyResponse.data);
      
      // Get user profile using verified token
      const profileResponse = await axios.get('https://api.line.me/v2/profile', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      const profile = profileResponse.data;
      console.log('LINE profile:', profile);

      // Find or create user
      let client = await Client.findOne({ userId: profile.userId });
      if (!client) {
        client = new Client({
          userId: profile.userId,
          displayName: profile.displayName,
          pictureUrl: profile.pictureUrl,
          userType: userType || 'store',
          idType: idType || 'store'
        });
      } else {
        // Update basic profile info
        client.displayName = profile.displayName;
        client.pictureUrl = profile.pictureUrl;

        // Update context if provided
        if (userType === 'store' || userType === 'wholesale') {
          client.userType = userType;
          client.idType = idType || 'store';
        }
      }
      await client.save();
      console.log('Saved client:', client);

      return res.json({
        valid: true,
        profile: {
          userId: client.userId,
          displayName: client.displayName,
          pictureUrl: client.pictureUrl,
          userType: client.userType,
          idType: client.idType,
          createdAt: client.createdAt  // เพิ่มส่วนนี้
        }
      });
    } catch (liffError) {
      console.log('Not a valid LIFF token, trying JWT...', liffError);
    }

    // If LIFF verification fails, try as JWT
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined');
    }

    const decoded = jwt.verify(token, jwtSecret) as { userId: string };
    const client = await Client.findOne({ userId: decoded.userId });

    if (!client) {
      return res.json({ valid: false, message: 'User not found' });
    }

    res.json({
      valid: true,
      profile: {
        userId: client.userId,
        displayName: client.displayName,
        pictureUrl: client.pictureUrl,
        userType: client.userType,
        idType: client.idType
      }
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ valid: false, message: 'Invalid token' });
  }
};

export const updateLineLoginConfig = async (req: Request, res: Response) => {
  console.log('Updating LINE login configuration');
  console.log('Request body:', req.body);
  try {
    const { LINE_LIFF_ID } = req.body;
    console.log('Received config:', { LINE_LIFF_ID });
    const config = await StoreConfig.findOneOrCreate();

    config.lineLogin = { LINE_LIFF_ID };
    await config.save();
    console.log('Updated config:', config.lineLogin);

    res.json({ message: 'LINE Login configuration updated successfully', config: config.lineLogin });
  } catch (error: unknown) {
    console.error('Error updating LINE Login configuration:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
    }
    res.status(500).json({ message: 'Internal server error' });
  }
};