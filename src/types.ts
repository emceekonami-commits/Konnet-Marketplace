export interface User {
  id: number;
  email: string;
  name: string;
  username: string;
  role: 'vendor' | 'admin' | 'buyer';
  phone: string;
  location: string;
  kyc_status: 'pending' | 'verified' | 'rejected';
  is_verified: boolean;
}

export interface Item {
  id: number;
  vendor_id: number;
  vendor_email?: string;
  title: string;
  description: string;
  price: number;
  phone: string;
  image_url: string;
  status: 'pending' | 'verified' | 'sold';
  created_at: string;
}

export interface Transaction {
  id: number;
  item_id: number;
  buyer_id: number;
  amount: number;
  status: 'escrow' | 'released';
  confirmed_at?: string;
  released_at?: string;
}
