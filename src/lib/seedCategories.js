import { supabase } from './supabase';

const DEFAULT_CATEGORIES = [
  { name: 'Original Songs', slug: 'original-songs', sort_order: 1 },
  { name: "Become Jehovah's Friend — Original Songs", slug: 'become-jehovahs-friend-original-songs', sort_order: 2 },
  { name: "Become Jehovah's Friend — Sing With Us", slug: 'become-jehovahs-friend-sing-with-us', sort_order: 3 },
  { name: 'International Music', slug: 'international-music', sort_order: 4 }
];

export async function seedCategoriesIfEmpty() {
  try {
    const { data: existing, error: fetchError } = await supabase.from('categories').select('id').limit(1);
    
    if (fetchError) {
      console.error("Error checking categories:", fetchError);
      return;
    }

    if (!existing || existing.length === 0) {
      console.log("No categories found. Seeding default categories...");
      const { error: insertError } = await supabase.from('categories').insert(DEFAULT_CATEGORIES);
      if (insertError) {
        console.error("Error inserting default categories:", insertError);
      } else {
        console.log("Successfully seeded default categories!");
      }
    }
  } catch (err) {
    console.error("Failed to seed categories:", err);
  }
}
