const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function updateNormalRate() {
  try {
    console.log('Mise à jour du taux normal mensuel à 12.5%...');

    const { data, error } = await supabase
      .from('monthly_progress')
      .update({ normal_rate: 12.5 })
      .select('*');

    if (error) {
      throw error;
    }

    console.log(`✅ ${data?.length || 0} lignes mises à jour avec succès`);
    console.log('Taux normal mensuel mis à jour à 12.5% pour toutes les entrées');

  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour:', error.message);
    process.exit(1);
  }
}

updateNormalRate();
