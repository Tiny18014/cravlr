export const flavorMoods = [
  { id: 1, name: 'Spicy' },
  { id: 2, name: 'Sweet' },
  { id: 3, name: 'Savory' },
  { id: 4, name: 'Umami' },
  { id: 5, name: 'Sour' },
  { id: 6, name: 'Tangy' },
  { id: 7, name: 'Salty' },
  { id: 8, name: 'Fresh' },
  { id: 9, name: 'Light' },
  { id: 10, name: 'Rich' },
  { id: 11, name: 'Creamy' },
  { id: 12, name: 'Crispy' },
  { id: 13, name: 'Smoky' },
  { id: 14, name: 'Herby' },
  { id: 15, name: 'Zesty' },
  { id: 16, name: 'Mild' },
  { id: 17, name: 'Bold' },
  { id: 18, name: 'Comforting' },
  { id: 19, name: 'Refreshing' },
  { id: 20, name: 'Indulgent' }
] as const;

export type FlavorMood = typeof flavorMoods[number];
