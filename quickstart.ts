import { FSDB } from '../src/index.js';

// 1. Initialize or load single-file database
const db = new FSDB('./demo-app.json');

console.log('--- 1. Key-Value Storage ---');
db.set('appTheme', 'midnight-blue');
db.set('windowSize', { width: 1280, height: 800 });

console.log('appTheme:', db.get('appTheme'));
console.log('windowSize:', db.get('windowSize'));

console.log('\n--- 2. Typed Document Collections ---');
interface Developer {
  name: string;
  role: 'frontend' | 'backend' | 'fullstack';
  skills: string[];
  experienceYears: number;
  profile: {
    github: string;
    available: boolean;
  };
}

const devs = db.collection<Developer>('developers');

// Clean up existing demo data
devs.clear();

// Insert records
const alice = devs.insert({
  name: 'Alice',
  role: 'fullstack',
  skills: ['TypeScript', 'React', 'Electron'],
  experienceYears: 5,
  profile: { github: 'alice-dev', available: true },
});

const bob = devs.insert({
  name: 'Bob',
  role: 'backend',
  skills: ['Node.js', 'PostgreSQL', 'Docker'],
  experienceYears: 3,
  profile: { github: 'bob-codes', available: false },
});

const charlie = devs.insert({
  name: 'Charlie',
  role: 'frontend',
  skills: ['Vue', 'CSS', 'Vite'],
  experienceYears: 2,
  profile: { github: 'charlie-ui', available: true },
});

console.log('Inserted developers count:', devs.count());

console.log('\n--- 3. Rich Queries with Operators & Dot-Notation ---');
// Find available developers with TypeScript or Vue skill
const available = devs.find({
  'profile.available': true,
  skills: { $in: ['TypeScript', 'Vue'] },
});
console.log('Available TS/Vue Devs:', available.map((d) => d.name));

// Fluent QueryBuilder
const experienced = devs
  .query()
  .where('experienceYears', '>=', 3)
  .sortBy({ experienceYears: 'desc' })
  .exec();

console.log('Experienced Devs (>= 3 yrs):', experienced.map((d) => `${d.name} (${d.experienceYears}y)`));

console.log('\n--- 4. Database File Details ---');
console.log('Database Path:', db.filePath);
console.log('Database Size:', db.size, 'bytes');
