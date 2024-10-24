import { Request, Response } from 'express';
import Client, { IShippingAddress } from '../../models/clientModel';

export const getShippingAddresses = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.query;
    if (!userId) {
      res.status(400).json({ message: 'UserId is required' });
      return;
    }

    const client = await Client.findOne({ userId });
    if (!client) {
      res.status(404).json({ message: 'Client not found' });
      return;
    }
    
    res.json(client.shippingAddresses);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching shipping addresses', error });
  }
};

export const addShippingAddress = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ message: 'UserId is required' });
      return;
    }

    const newAddress: IShippingAddress = req.body.address;
    const client = await Client.findOne({ userId });
    if (!client) {
      res.status(404).json({ message: 'Client not found' });
      return;
    }

    if (client.shippingAddresses.length === 0) {
      newAddress.isDefault = true;
    }
    client.shippingAddresses.push(newAddress);
    await client.save();
    
    res.status(201).json(client.shippingAddresses);
  } catch (error) {
    res.status(500).json({ message: 'Error adding shipping address', error });
  }
};


export const updateShippingAddress = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, addressId } = req.params;
    if (!userId || !addressId) {
      res.status(400).json({ message: 'UserId and AddressId are required' });
      return;
    }

    const client = await Client.findOne({ userId });
    if (!client) {
      res.status(404).json({ message: 'Client not found' });
      return;
    }

    const addressIndex = client.shippingAddresses.findIndex(addr => addr._id.toString() === addressId);
    if (addressIndex === -1) {
      res.status(404).json({ message: 'Address not found' });
      return;
    }

    const updatedAddress: Partial<IShippingAddress> = req.body.address;
    
    // Update only the fields that are present in updatedAddress
    (Object.keys(updatedAddress) as Array<keyof IShippingAddress>).forEach(key => {
      if (updatedAddress[key] !== undefined) {
        (client.shippingAddresses[addressIndex] as any)[key] = updatedAddress[key];
      }
    });

    await client.save();
    
    res.json(client.shippingAddresses);
  } catch (error) {
    res.status(500).json({ message: 'Error updating shipping address', error });
  }
};

export const deleteShippingAddress = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, addressId } = req.params;
    if (!userId || !addressId) {
      res.status(400).json({ message: 'UserId and AddressId are required' });
      return;
    }

    const client = await Client.findOne({ userId });
    if (!client) {
      res.status(404).json({ message: 'Client not found' });
      return;
    }

    const addressIndex = client.shippingAddresses.findIndex(addr => addr._id.toString() === addressId);
    if (addressIndex === -1) {
      res.status(404).json({ message: 'Address not found' });
      return;
    }

    // Remove the address
    client.shippingAddresses.splice(addressIndex, 1);

    // If we're deleting the default address and there are other addresses, set a new default
    if (client.shippingAddresses.length > 0 && client.shippingAddresses[addressIndex]?.isDefault) {
      client.shippingAddresses[0].isDefault = true;
    }

    await client.save();
    
    res.json(client.shippingAddresses);
  } catch (error: unknown) {
    console.error('Error deleting shipping address:', error);
    if (error instanceof Error) {
      res.status(500).json({ message: 'Error deleting shipping address', error: error.message });
    } else {
      res.status(500).json({ message: 'An unknown error occurred while deleting the shipping address' });
    }
  }
};


export const setDefaultAddress = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, addressId } = req.params;
    if (!userId || !addressId) {
      res.status(400).json({ message: 'UserId and AddressId are required' });
      return;
    }

    const client = await Client.findOne({ userId });
    if (!client) {
      res.status(404).json({ message: 'Client not found' });
      return;
    }

    const addressIndex = client.shippingAddresses.findIndex(addr => addr._id.toString() === addressId);
    if (addressIndex === -1) {
      res.status(404).json({ message: 'Address not found' });
      return;
    }

    // Set all addresses to non-default
    client.shippingAddresses.forEach(address => {
      address.isDefault = false;
    });

    // Set the selected address as default
    client.shippingAddresses[addressIndex].isDefault = true;

    await client.save();
    
    res.json(client.shippingAddresses);
  } catch (error: unknown) {
    console.error('Error setting default address:', error);
    if (error instanceof Error) {
      res.status(500).json({ message: 'Error setting default address', error: error.message });
    } else {
      res.status(500).json({ message: 'An unknown error occurred' });
    }
  }
};