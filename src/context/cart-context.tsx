'use client';

import { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { TicketFormValues } from '@/app/create-ticket/page';

export interface CartItem extends Omit<TicketFormValues, 'price'> {
  id: string;
  attendeePrice: number; // Price for the attendee
  price: number; // This is the PLATFORM FEE (e.g., 1000)
  quantity: number;
  eventName: string;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  cartTotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [hasMounted, setHasMounted] = useState(false);
  
  useEffect(() => {
    setHasMounted(true);
    const savedCart = localStorage.getItem('ticketCraftCart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  }, []);

  useEffect(() => {
    if (hasMounted) {
      localStorage.setItem('ticketCraftCart', JSON.stringify(cart));
    }
  }, [cart, hasMounted]);

  const addToCart = useCallback((item: CartItem) => {
    setCart((prevCart) => [...prevCart, item]);
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== itemId));
    toast({
        title: "Item Removed",
        description: "The category batch has been removed from your cart."
    })
  }, [toast]);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const cartTotal = useMemo(() => {
    return cart.reduce((total, item) => total + item.price, 0);
  }, [cart]);

  const value = { cart, addToCart, removeFromCart, clearCart, cartTotal };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextType {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
