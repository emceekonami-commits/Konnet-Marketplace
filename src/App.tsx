/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  PlusCircle, 
  ShieldCheck, 
  User as UserIcon, 
  Phone, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Menu,
  X,
  CreditCard,
  Search,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Item } from './types';

const LAGOS_LGAS = [
  "Agege", "Ajeromi-Ifelodun", "Alimosho", "Amuwo-Odofin", "Apapa", 
  "Badagry", "Epe", "Eti-Osa", "Ibeju-Lekki", "Ifako-Ijaiye", 
  "Ikeja", "Ikorodu", "Kosofe", "Lagos Island", "Lagos Mainland", 
  "Mushin", "Ojo", "Oshodi-Isolo", "Shomolu", "Surulere"
];

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<'marketplace' | 'upload' | 'admin' | 'profile'>('marketplace');
  const [items, setItems] = useState<Item[]>([]);
  const [pendingItems, setPendingItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  // Auth State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authStep, setAuthStep] = useState<'login' | 'register' | 'verify' | 'admin'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    fetchItems();
    if (currentUser?.role === 'admin') {
      fetchPendingItems();
    }
  }, [currentUser, view]);

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/items');
      const data = await res.json();
      setItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingItems = async () => {
    try {
      const res = await fetch('/api/admin/pending-items');
      const data = await res.json();
      setPendingItems(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendCode = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    setAuthEmail(data.email as string);

    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const result = await res.json();
        // In this simulation environment, we show the code to the user
        alert(`[SIMULATION] Verification code: ${result.code}\nIn a real app, this would be sent to your email.`);
        setAuthStep('verify');
      } else {
        const err = await res.json();
        alert(err.error || "Failed to send code");
      }
    } catch (err) {
      console.error(err);
      alert("Connection error. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!verificationCode || verificationCode.length < 6) {
      alert("Please enter the 6-digit code");
      return;
    }
    setAuthLoading(true);
    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, code: verificationCode }),
      });
      if (res.ok) {
        const user = await res.json();
        setCurrentUser(user);
        setShowAuthModal(false);
        setAuthStep('login');
        setVerificationCode('');
      } else {
        const err = await res.json();
        alert(err.error || "Invalid verification code");
      }
    } catch (err) {
      console.error(err);
      alert("Connection error. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    try {
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const user = await res.json();
        setCurrentUser(user);
        setShowAuthModal(false);
        setView('admin');
      } else {
        alert("Invalid admin credentials");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentUser) return;

    const formData = new FormData(e.currentTarget);
    const newItem = {
      vendor_id: currentUser.id,
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      price: parseFloat(formData.get('price') as string),
      phone: formData.get('phone') as string,
      image_url: previewImage || `https://picsum.photos/seed/${Math.random()}/800/600`,
    };

    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      });
      if (res.ok) {
        alert('Item uploaded! A Konnet Marketplace fact-checker will visit you for verification.');
        setPreviewImage(null);
        setView('marketplace');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const verifyItem = async (itemId: number) => {
    try {
      const res = await fetch('/api/admin/verify-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId }),
      });
      if (res.ok) {
        fetchPendingItems();
        alert('Item verified and listed!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const buyItem = async (item: Item) => {
    if (!currentUser) {
      alert('Please login to buy items.');
      return;
    }
    
    const confirmBuy = window.confirm(`Pay ₦${item.price.toLocaleString()} to Konnet Escrow for "${item.title}"?`);
    if (!confirmBuy) return;

    try {
      const res = await fetch('/api/pay-escrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: item.id,
          buyer_id: currentUser.id,
          amount: item.price,
        }),
      });
      if (res.ok) {
        alert('Payment successful! Funds are held in Escrow. Please confirm delivery once you receive the item.');
        fetchItems();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 glass border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('marketplace')}>
              <div className="bg-brand p-2 rounded-lg">
                <ShoppingBag className="text-white w-6 h-6" />
              </div>
              <span className="text-xl font-bold tracking-tight text-neutral-900">
                Konnet <span className="text-brand">Marketplace</span>
              </span>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-6">
              <button 
                onClick={() => setView('marketplace')}
                className={`text-sm font-medium transition-colors ${view === 'marketplace' ? 'text-brand' : 'text-neutral-600 hover:text-brand'}`}
              >
                Marketplace
              </button>
              {currentUser?.role === 'vendor' && (
                <button 
                  onClick={() => setView('upload')}
                  className={`text-sm font-medium transition-colors ${view === 'upload' ? 'text-brand' : 'text-neutral-600 hover:text-brand'}`}
                >
                  Sell Item
                </button>
              )}
              {currentUser?.role === 'admin' && (
                <button 
                  onClick={() => setView('admin')}
                  className={`text-sm font-medium transition-colors ${view === 'admin' ? 'text-brand' : 'text-neutral-600 hover:text-brand'}`}
                >
                  Admin Panel
                </button>
              )}
              
              {!currentUser ? (
                <div className="flex gap-2">
                  <button 
                    onClick={() => { setAuthStep('login'); setShowAuthModal(true); }}
                    className="text-sm font-semibold px-4 py-2 text-neutral-600 hover:text-brand transition-colors"
                  >
                    Login
                  </button>
                  <button 
                    onClick={() => { setAuthStep('register'); setShowAuthModal(true); }}
                    className="text-sm font-semibold px-4 py-2 bg-brand text-white rounded-xl hover:bg-brand-dark transition-all"
                  >
                    Join Now
                  </button>
                  <button 
                    onClick={() => { setAuthStep('admin'); setShowAuthModal(true); }}
                    className="text-[10px] text-neutral-400 hover:text-neutral-600"
                  >
                    Admin
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-semibold text-neutral-900">{currentUser.email}</span>
                    <span className="text-[10px] uppercase tracking-wider text-neutral-500">{currentUser.role}</span>
                  </div>
                  <button onClick={() => setCurrentUser(null)} className="p-2 rounded-full hover:bg-neutral-100">
                    <X className="w-5 h-5 text-neutral-400" />
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2">
                {isMenuOpen ? <X /> : <Menu />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section (Only on Marketplace) */}
      {view === 'marketplace' && (
        <div className="relative overflow-hidden bg-neutral-900 py-16 sm:py-24">
          <div className="absolute inset-0 opacity-20">
            <img 
              src="https://picsum.photos/seed/market/1920/1080" 
              alt="Background" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl sm:text-6xl font-bold text-white mb-6 tracking-tight"
            >
              Verified Items. <span className="text-brand">Secure Escrow.</span>
            </motion.h1>
            <p className="text-lg text-neutral-300 max-w-2xl mx-auto mb-10">
              The most trusted marketplace in Nigeria. Every item is physically verified by our fact-checkers before listing.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <div className="relative max-w-md w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5" />
                <input 
                  type="text" 
                  placeholder="Search for electronics, fashion, cars..." 
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <button className="bg-brand hover:bg-brand-dark text-white px-8 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2">
                Browse All <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <AnimatePresence mode="wait">
          {view === 'marketplace' && (
            <motion.div 
              key="marketplace"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex justify-between items-end mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-neutral-900">Featured Listings</h2>
                  <p className="text-neutral-500">Hand-picked and verified by Konnet experts</p>
                </div>
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Escrow Protected
                  </span>
                </div>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="h-80 bg-neutral-200 animate-pulse rounded-2xl" />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-neutral-200">
                  <ShoppingBag className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-neutral-900">No items found</h3>
                  <p className="text-neutral-500">Be the first to list an item on Konnet Marketplace!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {items.map((item) => (
                    <motion.div 
                      key={item.id}
                      layoutId={`item-${item.id}`}
                      className="group bg-white rounded-2xl overflow-hidden border border-neutral-200 hover:shadow-xl transition-all duration-300"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden">
                        <img 
                          src={item.image_url} 
                          alt={item.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-3 right-3">
                          <span className="bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Verified
                          </span>
                        </div>
                      </div>
                      <div className="p-5">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-neutral-900 truncate pr-2">{item.title}</h3>
                          <span className="text-brand font-bold whitespace-nowrap">₦{item.price.toLocaleString()}</span>
                        </div>
                        <p className="text-sm text-neutral-500 line-clamp-2 mb-4 h-10">
                          {item.description}
                        </p>
                        <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-neutral-600">
                              <Phone className="w-3 h-3" />
                              <span className="text-xs font-medium">{item.phone}</span>
                            </div>
                            {(item as any).vendor_location && (
                              <div className="flex items-center gap-2 text-neutral-400">
                                <Search className="w-3 h-3" />
                                <span className="text-[10px] font-medium">{(item as any).vendor_location}, Lagos</span>
                              </div>
                            )}
                          </div>
                          <button 
                            onClick={() => buyItem(item)}
                            className="bg-neutral-900 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-brand transition-colors"
                          >
                            Buy Now
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {view === 'upload' && (
            <motion.div 
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto"
            >
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-neutral-200">
                <div className="flex items-center gap-4 mb-8">
                  <div className="bg-brand/10 p-3 rounded-2xl">
                    <PlusCircle className="text-brand w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-neutral-900">List New Item</h2>
                    <p className="text-neutral-500">Verification fee: ₦2,000 monthly</p>
                  </div>
                </div>

                <form onSubmit={handleUpload} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-neutral-700 mb-2">Item Image</label>
                      <div className="flex flex-col items-center justify-center border-2 border-dashed border-neutral-200 rounded-2xl p-6 hover:border-brand transition-colors cursor-pointer relative overflow-hidden group">
                        {previewImage ? (
                          <div className="relative w-full aspect-video">
                            <img src={previewImage} alt="Preview" className="w-full h-full object-cover rounded-xl" />
                            <button 
                              type="button"
                              onClick={() => setPreviewImage(null)}
                              className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full hover:bg-black/70"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="text-center">
                            <PlusCircle className="w-10 h-10 text-neutral-300 mx-auto mb-2 group-hover:text-brand" />
                            <p className="text-sm text-neutral-500">Click to upload item photo</p>
                            <p className="text-[10px] text-neutral-400 mt-1">PNG, JPG up to 5MB</p>
                          </div>
                        )}
                        <input 
                          type="file" 
                          accept="image/*"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setPreviewImage(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-neutral-700 mb-2">Item Title</label>
                      <input 
                        name="title"
                        required
                        type="text" 
                        placeholder="e.g. iPhone 13 Pro Max - 256GB" 
                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-brand focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-neutral-700 mb-2">Price (₦)</label>
                      <input 
                        name="price"
                        required
                        type="number" 
                        placeholder="0.00" 
                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-brand focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-neutral-700 mb-2">Contact Phone Number</label>
                      <input 
                        name="phone"
                        required
                        type="tel" 
                        placeholder="080..." 
                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-brand focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-neutral-700 mb-2">Description</label>
                      <textarea 
                        name="description"
                        required
                        rows={4}
                        placeholder="Describe the item condition, features, and any flaws..." 
                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-brand focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-brand shrink-0 mt-0.5" />
                    <p className="text-xs text-neutral-600 leading-relaxed">
                      By listing this item, you agree to pay a monthly advertising fee of ₦2,000. 
                      A Konnet Marketplace fact-checker will contact you within 24 hours to schedule a physical inspection and KYC verification.
                    </p>
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-brand hover:bg-brand-dark text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-brand/20 flex items-center justify-center gap-2"
                  >
                    Pay ₦2,000 & Submit for Verification <ArrowRight className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {view === 'admin' && (
            <motion.div 
              key="admin"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-neutral-900">Admin Verification Queue</h2>
                  <p className="text-neutral-500">Fact-checkers: Review and verify physical items</p>
                </div>
                <button 
                  onClick={async () => {
                    const res = await fetch('/api/admin/release-funds', { method: 'POST' });
                    const data = await res.json();
                    alert(`Released funds for ${data.released_count} transactions.`);
                  }}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
                >
                  <CreditCard className="w-4 h-4" /> Release Escrow Funds (12h+)
                </button>
              </div>

              <div className="bg-white rounded-3xl border border-neutral-200 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-neutral-50 border-b border-neutral-200">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-500">Item</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-500">Vendor</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-500">Price</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-500">Status</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-500 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {pendingItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-neutral-500">No items pending verification</td>
                      </tr>
                    ) : (
                      pendingItems.map((item) => (
                        <tr key={item.id} className="hover:bg-neutral-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <img src={item.image_url} className="w-10 h-10 rounded-lg object-cover" referrerPolicy="no-referrer" />
                              <span className="font-semibold text-neutral-900">{item.title}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-neutral-600">{item.vendor_email}</td>
                          <td className="px-6 py-4 text-sm font-bold text-neutral-900">₦{item.price.toLocaleString()}</td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1 w-fit">
                              <Clock className="w-3 h-3" /> Pending Visit
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => verifyItem(item.id)}
                              className="bg-neutral-900 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-emerald-600 transition-colors"
                            >
                              Verify & List
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-neutral-200 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-brand p-1.5 rounded-lg">
                  <ShoppingBag className="text-white w-5 h-5" />
                </div>
                <span className="text-lg font-bold tracking-tight text-neutral-900">
                  Konnet Marketplace
                </span>
              </div>
              <p className="text-neutral-500 text-sm max-w-sm">
                Nigeria's first physically verified marketplace. We protect both buyers and sellers through our rigorous verification process and secure escrow system.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-neutral-900 mb-4">Marketplace</h4>
              <ul className="space-y-2 text-sm text-neutral-500">
                <li><a href="#" className="hover:text-brand">Electronics</a></li>
                <li><a href="#" className="hover:text-brand">Fashion</a></li>
                <li><a href="#" className="hover:text-brand">Real Estate</a></li>
                <li><a href="#" className="hover:text-brand">Vehicles</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-neutral-900 mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-neutral-500">
                <li><a href="#" className="hover:text-brand">How it works</a></li>
                <li><a href="#" className="hover:text-brand">Safety Tips</a></li>
                <li><a href="#" className="hover:text-brand">Contact Us</a></li>
                <li><a href="#" className="hover:text-brand">Escrow Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-neutral-100 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-neutral-400">© 2026 Konnet Marketplace. All rights reserved.</p>
            <div className="flex gap-6">
              <ShieldCheck className="w-5 h-5 text-neutral-300" />
              <CreditCard className="w-5 h-5 text-neutral-300" />
              <UserIcon className="w-5 h-5 text-neutral-300" />
            </div>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAuthModal(false)}
              className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-neutral-900">
                    {authStep === 'login' && 'Welcome Back'}
                    {authStep === 'register' && 'Create Account'}
                    {authStep === 'verify' && 'Verify Email'}
                    {authStep === 'admin' && 'Admin Access'}
                  </h3>
                  <button onClick={() => setShowAuthModal(false)} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
                    <X className="w-5 h-5 text-neutral-400" />
                  </button>
                </div>

                {authStep === 'login' && (
                  <form onSubmit={handleSendCode} className="space-y-4">
                    <p className="text-sm text-neutral-500 mb-4">Enter your email to receive a login code.</p>
                    <input name="email" type="email" required placeholder="Email Address" className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-brand focus:outline-none" />
                    <button disabled={authLoading} type="submit" className="w-full bg-brand text-white font-bold py-3 rounded-xl hover:bg-brand-dark transition-all disabled:opacity-50">
                      {authLoading ? 'Sending...' : 'Send Login Code'}
                    </button>
                    <p className="text-center text-sm text-neutral-500">
                      Don't have an account? <button type="button" onClick={() => setAuthStep('register')} className="text-brand font-bold">Register</button>
                    </p>
                  </form>
                )}

                {authStep === 'register' && (
                  <form onSubmit={handleSendCode} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <input name="name" type="text" required placeholder="Full Name" className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-brand focus:outline-none" />
                      <input name="username" type="text" required placeholder="Username" className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-brand focus:outline-none" />
                    </div>
                    <input name="email" type="email" required placeholder="Email Address" className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-brand focus:outline-none" />
                    <input name="phone" type="tel" required placeholder="Phone Number" className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-brand focus:outline-none" />
                    
                    <select name="location" required className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-brand focus:outline-none bg-white">
                      <option value="">Select LGA in Lagos</option>
                      {LAGOS_LGAS.map(lga => <option key={lga} value={lga}>{lga}</option>)}
                    </select>

                    <select name="role" required className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-brand focus:outline-none bg-white">
                      <option value="buyer">I want to Buy</option>
                      <option value="vendor">I want to Sell</option>
                    </select>

                    <button disabled={authLoading} type="submit" className="w-full bg-brand text-white font-bold py-3 rounded-xl hover:bg-brand-dark transition-all disabled:opacity-50">
                      {authLoading ? 'Creating Account...' : 'Register & Verify'}
                    </button>
                    <p className="text-center text-sm text-neutral-500">
                      Already have an account? <button type="button" onClick={() => setAuthStep('login')} className="text-brand font-bold">Login</button>
                    </p>
                  </form>
                )}

                {authStep === 'verify' && (
                  <form onSubmit={handleVerifyCode} className="space-y-4">
                    <p className="text-sm text-neutral-500 mb-4">We sent a 6-digit code to <strong>{authEmail}</strong>. Enter it below to continue.</p>
                    <input 
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      type="text" 
                      maxLength={6}
                      required 
                      placeholder="000000" 
                      className="w-full px-4 py-4 text-center text-3xl font-bold tracking-[0.5em] rounded-xl border border-neutral-200 focus:ring-2 focus:ring-brand focus:outline-none" 
                    />
                    <button disabled={authLoading} type="submit" className="w-full bg-neutral-900 text-white font-bold py-3 rounded-xl hover:bg-brand transition-all disabled:opacity-50">
                      {authLoading ? 'Verifying...' : 'Verify & Login'}
                    </button>
                    <button type="button" onClick={() => setAuthStep('login')} className="w-full text-sm text-neutral-500 hover:text-brand">Change Email</button>
                  </form>
                )}

                {authStep === 'admin' && (
                  <form onSubmit={handleAdminLogin} className="space-y-4">
                    <input name="name" type="text" required placeholder="Admin Name" className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-brand focus:outline-none" />
                    <input name="password" type="password" required placeholder="Admin Password" className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-brand focus:outline-none" />
                    <button disabled={authLoading} type="submit" className="w-full bg-neutral-900 text-white font-bold py-3 rounded-xl hover:bg-brand transition-all disabled:opacity-50">
                      {authLoading ? 'Accessing...' : 'Admin Login'}
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
