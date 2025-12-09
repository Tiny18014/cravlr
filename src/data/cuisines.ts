export const cuisines = [
  { id: 1, name: 'American' },
  { id: 2, name: 'Italian' },
  { id: 3, name: 'Mexican' },
  { id: 4, name: 'Chinese' },
  { id: 5, name: 'Japanese' },
  { id: 6, name: 'Indian' },
  { id: 7, name: 'Thai' },
  { id: 8, name: 'Mediterranean' },
  { id: 9, name: 'Middle Eastern' },
  { id: 10, name: 'Korean' },
  { id: 11, name: 'Vietnamese' },
  { id: 12, name: 'French' },
  { id: 13, name: 'Spanish' },
  { id: 14, name: 'Greek' },
  { id: 15, name: 'African' },
  { id: 16, name: 'Caribbean' },
  { id: 17, name: 'Brazilian' },
  { id: 18, name: 'German' },
  { id: 19, name: 'British' },
  { id: 20, name: 'Turkish' },
  { id: 21, name: 'Filipino' },
  { id: 22, name: 'Indonesian' },
  { id: 23, name: 'Malaysian' },
  { id: 24, name: 'Peruvian' },
  { id: 25, name: 'Ethiopian' }
] as const;

export type Cuisine = typeof cuisines[number];
