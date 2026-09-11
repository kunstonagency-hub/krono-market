import React from 'react';

// ÍCONOS VECTORIALES LINEALES
export const IconBurger = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 18 0H3Z"/><path d="M3 16h18v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2Z"/><path d="M3 14h18"/></svg>;
export const IconPizza = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21L21 3H3L12 21Z"/><path d="M5.5 8H18.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="15" cy="15" r="1"/><circle cx="9" cy="14" r="1"/></svg>;
export const IconSushi = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="7" rx="6" ry="3"/><path d="M6 7v10c0 1.66 2.69 3 6 3s6-1.34 6-3V7"/><circle cx="12" cy="7" r="1.5"/></svg>;
export const IconChicken = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 13l-4 4a3.5 3.5 0 0 0 5 5l4-4"/><path d="M18.5 3.5a4.5 4.5 0 0 0-6.36 0L8.5 7.14a4.5 4.5 0 0 0 6.36 6.36l3.64-3.64a4.5 4.5 0 0 0 0-6.36Z"/></svg>;
export const IconIceCream = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 11l4.08 10.35a1 1 0 0 0 1.84 0L17 11"/><path d="M17 7A5 5 0 0 0 7 7c0 2 5 4 5 4s5-2 5-4z"/></svg>;
export const IconDrink = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8l1.5 14h9L18 8H6z"/><path d="M5 8h14"/><path d="M14 8V3l-3-1"/></svg>;
export const IconSalad = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 13a9 9 0 0 0 18 0H3z"/><path d="M7 9c0-2 2-3 5-3s5 1 5 3"/><path d="M9 13c0-2 1.5-4 3-4s3 2 3 4"/></svg>;

// BASES DE DATOS SIMULADAS
export const banners = [
  { id: 1, img: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80", alt: "Promo Especial 1" },
  { id: 2, img: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1200&q=80", alt: "Promo Hamburguesas" },
  { id: 3, img: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1200&q=80", alt: "Promo Sushi" }
];

export const coreCategories = [
  { id: 1, name: "Hamburguesas", icon: <IconBurger /> },
  { id: 2, name: "Pizzas", icon: <IconPizza /> },
  { id: 3, name: "Sushi", icon: <IconSushi /> },
  { id: 4, name: "Pollo", icon: <IconChicken /> },
  { id: 5, name: "Postres", icon: <IconIceCream /> },
  { id: 6, name: "Bebidas", icon: <IconDrink /> },
  { id: 7, name: "Saludable", icon: <IconSalad /> }
];

// Arreglo infinito para el carrusel
export const infiniteCategories = [...coreCategories, ...coreCategories, ...coreCategories, ...coreCategories, ...coreCategories];

export const suggestedDishes = [
  { id: 1, name: "Promo 2x1 Smash", restaurant: "Llanero Chuy's Burger", price: 12.00, img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=80" },
  { id: 2, name: "Familiar + Refresco", restaurant: "Pizza Nostra", price: 18.50, img: "https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=500&q=80" },
  { id: 3, name: "Combo Alitas BBQ", restaurant: "KFC", price: 15.00, img: "https://images.unsplash.com/photo-1608039829572-78524f79c4c7?auto=format&fit=crop&w=500&q=80" }
];

export const featuredRestaurants = [
  { id: 1, name: "Llanero Chuy's Burger", category: "Hamburguesas", rating: 4.8, time: "25-35 min", delivery: 2.50, isFiskal: true, img: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80" },
  { id: 4, name: "Pizza Nostra", category: "Pizzas • Italiana", rating: 4.6, time: "35-50 min", delivery: 4.00, isFiskal: true, img: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80" }
];

export const allRestaurants = [
  { id: 2, name: "KFC", category: "Pollo Frito • Combos", rating: 4.5, time: "30-45 min", delivery: 3.00, isFiskal: false, img: "https://images.unsplash.com/photo-1513185158878-8d8c2a2a3da3?auto=format&fit=crop&w=800&q=80" },
  { id: 3, name: "McDonald's", category: "Hamburguesas • Desayunos", rating: 4.3, time: "20-30 min", delivery: 2.00, isFiskal: true, img: "https://images.unsplash.com/photo-1552895638-f7fe08d2f7d5?auto=format&fit=crop&w=800&q=80" },
  { id: 5, name: "Sushi House", category: "Asiática • Sushi", rating: 4.7, time: "40-55 min", delivery: 3.50, isFiskal: false, img: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=80" }
];