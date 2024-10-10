// path: scripts/migrateDatabase.js
import { MongoClient } from 'mongodb';
import crypto from 'crypto';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/picrate';

async function migrateDatabase() {
  let client;

  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db();

    // Create new images collection
    if (!(await db.listCollections({ name: 'images' }).toArray()).length) {
      await db.createCollection('images');
    }

    // Migrate cache collection
    const cacheCollection = db.collection('cache');
    const imagesCollection = db.collection('images');
    
    const cursor = cacheCollection.find({ imageData: { $exists: true } });
    
    let migratedCount = 0;
    await cursor.forEach(async (doc) => {
      const imageId = crypto.createHash('sha256').update(doc.imageData).digest('hex');
      
      // Store image in images collection
      await imagesCollection.updateOne(
        { imageId },
        { 
          $set: { 
            imageData: doc.imageData,
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );
      
      // Update cache document
      await cacheCollection.updateOne(
        { _id: doc._id },
        { 
          $set: { imageId },
          $unset: { imageData: "" }
        }
      );
      
      migratedCount++;
    });

    // Migrate scorers collection
    const scorersCollection = db.collection('scorers');
    const scorersCursor = scorersCollection.find({ avatar: { $exists: true } });
    
    let migratedScorersCount = 0;
    await scorersCursor.forEach(async (doc) => {
      const imageId = crypto.createHash('sha256').update(doc.avatar).digest('hex');
      
      // Store image in images collection
      await imagesCollection.updateOne(
        { imageId },
        { 
          $set: { 
            imageData: doc.avatar,
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );
      
      // Update scorer document
      await scorersCollection.updateOne(
        { _id: doc._id },
        { 
          $set: { imageId },
          $unset: { avatar: "" }
        }
      );
      
      migratedScorersCount++;
    });

    console.log(`Migration completed successfully!`);
    console.log(`Migrated ${migratedCount} cache entries and ${migratedScorersCount} scorer entries`);

  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

migrateDatabase();