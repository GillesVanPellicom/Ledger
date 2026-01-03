import {initializeApp, cert} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore, FieldValue} from 'firebase-admin/firestore';
import {getStorage} from 'firebase-admin/storage';
import serviceAccount
  from '../../keys/serviceAccountKey.json' with {type: 'json'};
import chalk from 'chalk';
import {task, info, success, done} from '../cli/styling.js';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

initializeApp({
  credential: cert(serviceAccount),
  storageBucket: 'webapps-3bef1.firebasestorage.app' // Hardcoded from environment.development.ts as it is not imported here
});
const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

const threadCount = 4;

/**
 * USERS
 */
const users = [
  {
    uid: 'admin_user',
    email: 'admin@example.com',
    password: 'password',
    role: 'admin',
  },
  {
    uid: 'normal_user',
    email: 'user@example.com',
    password: 'password',
    role: 'user',
  },
  {
    uid: 'normal_user1',
    email: 'user1@example.com',
    password: 'password',
    role: 'user',
  },
  {
    uid: 'normal_user2',
    email: 'user2@example.com',
    password: 'password',
    role: 'user',
  },
  {
    uid: 'normal_user3',
    email: 'user3@example.com',
    password: 'password',
    role: 'user',
  },
  {
    uid: 'normal_user4',
    email: 'user4@example.com',
    password: 'password',
    role: 'user',
  },

];

/**
 * ITEMS
 */
const items = [
  {
    title: 'Angular for Beginners',
    quantity: 50,
    description: 'Learn the fundamentals of Angular v20, including standalone components and signals.',
    likes: 0,
  },
  {
    title: 'Firebase Essentials',
    quantity: 30,
    description: 'A complete guide to Firestore, Authentication, and Hosting for modern web apps.',
    likes: 0,
  },
  {
    title: 'RxJS Deep Dive',
    quantity: 25,
    description: 'Master reactive programming with Observables and high-level operators.',
    likes: 0,
  },
  {
    title: 'TypeScript Mastery',
    quantity: 40,
    description: 'Level up your JavaScript with static types and advanced compiler features.',
    likes: 0,
  },
  {
    title: 'UI/UX Principles',
    quantity: 15,
    description: 'Essential design patterns for creating beautiful and intuitive user interfaces.',
    likes: 0,
  },

  {
    title: 'Python for Data Science',
    quantity: 50,
    description: 'Learn Python for data analysis, visualization, and machine learning.',
    likes: 0,
  },
  {
    title: 'Java Fundamentals',
    quantity: 40,
    description: 'Core Java programming, OOP concepts, and standard libraries.',
    likes: 0,
  },
  {
    title: 'C++ Advanced Programming',
    quantity: 35,
    description: 'Memory management, templates, STL, and multithreading in C++.',
    likes: 0,
  },
  {
    title: 'Web Development Bootcamp',
    quantity: 45,
    description: 'Full stack web development with HTML, CSS, JS, and Node.js.',
    likes: 0,
  },
  {
    title: 'React Essentials',
    quantity: 30,
    description: 'Build dynamic web apps using React and component-based architecture.',
    likes: 0,
  },

  {
    title: 'Vue.js Fundamentals',
    quantity: 25,
    description: 'Get started with Vue 3, Composition API, and reactive components.',
    likes: 0,
  },
  {
    title: 'SQL & Database Design',
    quantity: 40,
    description: 'Master relational databases, queries, and normalization.',
    likes: 0,
  },
  {
    title: 'NoSQL with MongoDB',
    quantity: 35,
    description: 'Learn schema design and queries for document-oriented databases.',
    likes: 0,
  },
  {
    title: 'Docker & Containers',
    quantity: 20,
    description: 'Containerize applications and manage deployments with Docker.',
    likes: 0,
  },
  {
    title: 'Kubernetes Basics',
    quantity: 15,
    description: 'Orchestrate containerized applications using Kubernetes.',
    likes: 0,
  },

  {
    title: 'AWS Cloud Practitioner',
    quantity: 30,
    description: 'Introduction to AWS services, cloud concepts, and architecture.',
    likes: 0,
  },
  {
    title: 'Azure Fundamentals',
    quantity: 25,
    description: 'Get started with Microsoft Azure cloud services and deployment.',
    likes: 0,
  },
  {
    title: 'Linux Administration',
    quantity: 40,
    description: 'System administration, bash scripting, and server management.',
    likes: 0,
  },
  {
    title: 'Network Security',
    quantity: 20,
    description: 'Learn firewalls, VPNs, encryption, and securing networks.',
    likes: 0,
  },
  {
    title: 'Ethical Hacking',
    quantity: 15,
    description: 'Introduction to penetration testing and cybersecurity practices.',
    likes: 0,
  },

  {
    title: 'Machine Learning Basics',
    quantity: 25,
    description: 'Supervised and unsupervised learning, regression, and classification.',
    likes: 0,
  },
  {
    title: 'Deep Learning with TensorFlow',
    quantity: 20,
    description: 'Build neural networks for image and text applications.',
    likes: 0,
  },
  {
    title: 'Artificial Intelligence Foundations',
    quantity: 30,
    description: 'Core AI concepts, search algorithms, and problem-solving techniques.',
    likes: 0,
  },
  {
    title: 'Data Structures & Algorithms',
    quantity: 35,
    description: 'Essential CS concepts: arrays, trees, graphs, sorting, and searching.',
    likes: 0,
  },
  {
    title: 'Operating Systems Internals',
    quantity: 25,
    description: 'Process management, memory, and concurrency in modern OS.',
    likes: 0,
  },

  {
    title: 'Blockchain Development',
    quantity: 15,
    description: 'Learn smart contracts and blockchain fundamentals.',
    likes: 0,
  },
  {
    title: 'Cybersecurity Fundamentals',
    quantity: 20,
    description: 'Understand threats, vulnerabilities, and defense mechanisms.',
    likes: 0,
  },
  {
    title: 'DevOps Practices',
    quantity: 30,
    description: 'Continuous integration, deployment, and automation principles.',
    likes: 0,
  },
  {
    title: 'Git & Version Control',
    quantity: 40,
    description: 'Collaborative development using Git, GitHub, and workflows.',
    likes: 0,
  },
  {
    title: 'Agile & Scrum Methodology',
    quantity: 25,
    description: 'Agile principles, Scrum framework, and project management.',
    likes: 0,
  },

  {
    title: 'Mobile App Development with Flutter',
    quantity: 30,
    description: 'Build cross-platform mobile apps with Flutter and Dart.',
    likes: 0,
  },
  {
    title: 'iOS Development with Swift',
    quantity: 20,
    description: 'Create iOS apps using Swift and Xcode.',
    likes: 0,
  },
  {
    title: 'Android Development with Kotlin',
    quantity: 25,
    description: 'Develop modern Android apps using Kotlin.',
    likes: 0,
  },
  {
    title: 'Game Development with Unity',
    quantity: 15,
    description: 'Build 2D/3D games using Unity and C#.',
    likes: 0,
  },
  {
    title: 'Augmented Reality Fundamentals',
    quantity: 10,
    description: 'Learn AR concepts and frameworks for interactive apps.',
    likes: 0,
  },

  {
    title: 'Quantum Computing Basics',
    quantity: 8,
    description: 'Introduction to qubits, quantum gates, and algorithms.',
    likes: 0,
  },
  {
    title: 'Computer Graphics',
    quantity: 15,
    description: 'Rendering, shading, and graphics pipeline fundamentals.',
    likes: 0,
  },
  {
    title: 'Compiler Design',
    quantity: 12,
    description: 'Lexical analysis, parsing, and code generation techniques.',
    likes: 0,
  },
  {
    title: 'Software Architecture Patterns',
    quantity: 20,
    description: 'MVC, MVVM, microservices, and event-driven architectures.',
    likes: 0,
  },
  {
    title: 'Cloud Security',
    quantity: 18,
    description: 'Protect cloud resources and enforce security best practices.',
    likes: 0,
  },

  {
    title: 'Big Data Analytics',
    quantity: 22,
    description: 'Handle large datasets using Hadoop, Spark, and analytics tools.',
    likes: 0,
  },
  {
    title: 'Natural Language Processing',
    quantity: 15,
    description: 'Build applications that understand human language.',
    likes: 0,
  },
  {
    title: 'Computer Vision',
    quantity: 18,
    description: 'Image processing and object recognition techniques.',
    likes: 0,
  },
  {
    title: 'Parallel & Distributed Computing',
    quantity: 12,
    description: 'Design high-performance distributed systems.',
    likes: 0,
  },
  {
    title: 'Embedded Systems',
    quantity: 10,
    description: 'Microcontroller programming and IoT device integration.',
    likes: 0,
  },

  {
    title: 'Robotics Programming',
    quantity: 15,
    description: 'Control and program autonomous robots.',
    likes: 0,
  },
  {
    title: 'Software Testing & QA',
    quantity: 25,
    description: 'Manual and automated testing practices for software projects.',
    likes: 0,
  },
  {
    title: 'Project Management for IT',
    quantity: 20,
    description: 'Manage IT projects efficiently using PM tools and techniques.',
    likes: 0,
  },
  {
    title: 'Data Visualization',
    quantity: 18,
    description: 'Communicate data effectively using charts, dashboards, and tools.',
    likes: 0,
  },
  {
    title: 'Internet of Things (IoT)',
    quantity: 15,
    description: 'Connect devices and process sensor data for IoT applications.',
    likes: 0,
  },

  {
    title: 'RESTful API Development',
    quantity: 30,
    description: 'Design and build APIs using best practices.',
    likes: 0,
  },
  {
    title: 'GraphQL Fundamentals',
    quantity: 20,
    description: 'Learn how to query APIs efficiently using GraphQL.',
    likes: 0,
  },
  {
    title: 'Serverless Architecture',
    quantity: 18,
    description: 'Deploy functions and microservices without managing servers.',
    likes: 0,
  },
  {
    title: 'Edge Computing',
    quantity: 12,
    description: 'Run computation closer to the data source for efficiency.',
    likes: 0,
  },
  {
    title: 'Cyber Threat Intelligence',
    quantity: 10,
    description: 'Monitor and analyze cyber threats in real time.',
    likes: 0,
  },

  {
    title: 'AI Ethics & Policy',
    quantity: 15,
    description: 'Learn ethical principles and policies for AI deployment.',
    likes: 0,
  },
  {
    title: 'High Performance Computing',
    quantity: 12,
    description: 'Techniques for parallel processing and supercomputing.',
    likes: 0,
  },
  {
    title: 'Augmented Analytics',
    quantity: 18,
    description: 'Combine AI and analytics to gain deeper insights.',
    likes: 0,
  },
];

const pLimitLocal = (concurrency) => {
  const queue = [];
  let activeCount = 0;

  const next = () => {
    activeCount--;
    if (queue.length > 0) {
      queue.shift()();
    }
  };

  const run = async (fn, resolve, args) => {
    activeCount++;
    const result = (async () => fn(...args))();
    resolve(result);
    try {
      await result;
    } catch {}
    next();
  };

  const enqueue = (fn, resolve, args) => {
    queue.push(run.bind(null, fn, resolve, args));
    if (activeCount < concurrency && queue.length > 0) {
      queue.shift()();
    }
  };

  const generator = (fn, ...args) =>
    new Promise((resolve) => {
      enqueue(fn, resolve, args);
    });

  return generator;
};

const limit = pLimitLocal(threadCount);

async function seed() {
  info('Starting seeding process. Spinning up threads...');
  done(`${threadCount} threads booted up successfully`);

  // -------------------- Users --------------------
  info('Seeding users...');

  const userPromises = users.map(u => limit(() => task(`Processing user: ${u.email} `, async () => {
    let user;
    try {
      user = await auth.getUserByEmail(u.email);
      return 'EXISTS';
    } catch {
      user = await auth.createUser({
        uid: u.uid,
        email: u.email,
        password: u.password,
      });
    }
    await db.collection('users').doc(user.uid).set({
      uid: user.uid,
      email: u.email,
      role: u.role,
    }, {merge: true});
  })));

  await Promise.all(userPromises);
  done('Seeding users finished');

  // -------------------- Image --------------------
  info('Uploading default image...');
  let imageUrl = '';
  await task('Uploading default-splash.webp ', async () => {
    const bucket = storage.bucket();
    const filePath = path.join(__dirname, '../../public/img/default-splash.webp');
    const destination = 'default-splash.webp';

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    await bucket.upload(filePath, {
      destination: destination,
      public: true,
      metadata: {
        contentType: 'image/webp',
      },
    });

    const file = bucket.file(destination);

    // Using the public URL from google cloud storage
    imageUrl = file.publicUrl();
    return 'UPLOADED';
  });
  done('Image upload finished');

  // -------------------- Items --------------------
  info('Seeding items...');

  const itemPromises = items.map(it => limit(() => task(`Processing item: "${it.title}" `, async () => {
    const snapshot = await db.collection('items').
      where('title', '==', it.title).
      get();

    const itemData = {
      ...it,
      image: imageUrl
    };

    if (!snapshot.empty) {
      const docId = snapshot.docs[0].id;
      await db.collection('items').doc(docId).update({ image: imageUrl });
      return 'EXISTS';
    } else {
      await db.collection('items').add(itemData);
      return 'CREATED';
    }
  })));

  await Promise.all(itemPromises);
  done('Seeding items finished');

  // -------------------- Likes --------------------
  info('Seeding likes...');
  const allItemsSnap = await db.collection('items').get();
  const allItems = allItemsSnap.docs.map(doc => ({id: doc.id, ...doc.data()}));

  const likeTasks = [];
  for (const item of allItems) {
    for (const u of users) {
      if (Math.random() < (2 / 16)) {
        likeTasks.push(() => task(`Processing like: ${u.email} => "${item.title}" `, async () => {
          const likeRef = db.collection('items').
            doc(item.id).
            collection('likes').
            doc(u.uid);
          const likeSnap = await likeRef.get();

          if (!likeSnap.exists) {
            await likeRef.set({
              userId: u.uid,
              timestamp: new Date(),
            });
            await db.collection('items').doc(item.id).update({
              likes: FieldValue.increment(1),
            });
            return 'LIKED';
          }
        }));
      }
    }
  }

  const likePromises = likeTasks.map(t => limit(t));
  await Promise.all(likePromises);
  done('Seeding likes finished');

  success('Seeding completed successfully');
}

seed().catch(err => {
  console.error(chalk.red.bold('ERROR  Seeding failed:'), err.message);
  process.exit(1);
});