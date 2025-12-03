import "dotenv/config";
import mongoose from "mongoose";
import UserModel from "./Kambaz/Users/model.js";

const CONNECTION_STRING = process.env.DATABASE_CONNECTION_STRING || "mongodb://127.0.0.1:27017/kambaz";

// Old users data (from Database/users.js)
const oldUsers = [
  {
    "_id": "123",
    "username": "iron_man",
    "password": "stark123",
    "firstName": "Tony",
    "lastName": "Stark",
    "email": "tony@stark.com",
    "dob": new Date("1970-05-29T00:00:00.000Z"),
    "role": "FACULTY",
    "loginId": "001234561S",
    "section": "S101",
    "lastActivity": new Date("2020-10-01T00:00:00.000Z"),
    "totalActivity": "10:21:32"
  },
  {
    "_id": "234",
    "username": "dark_knight",
    "password": "wayne123",
    "firstName": "Bruce",
    "lastName": "Wayne",
    "email": "bruce@wayne.com",
    "dob": new Date("1972-02-19T00:00:00.000Z"),
    "role": "STUDENT",
    "loginId": "001234562S",
    "section": "S101",
    "lastActivity": new Date("2020-11-02T00:00:00.000Z"),
    "totalActivity": "15:32:43"
  },
  {
    "_id": "345",
    "username": "black_widow",
    "password": "romanoff123",
    "firstName": "Natasha",
    "lastName": "Romanoff",
    "email": "natasha@avengers.com",
    "dob": new Date("1984-11-22T00:00:00.000Z"),
    "role": "TA",
    "loginId": "001234564S",
    "section": "S101",
    "lastActivity": new Date("2020-11-05T00:00:00.000Z"),
    "totalActivity": "13:23:34"
  },
  {
    "_id": "456",
    "username": "thor_odinson",
    "password": "mjolnir123",
    "firstName": "Thor",
    "lastName": "Odinson",
    "email": "thor@asgard.com",
    "dob": new Date("982-05-25T00:00:00.000Z"),
    "role": "STUDENT",
    "loginId": "001234565S",
    "section": "S101",
    "lastActivity": new Date("2020-12-01T00:00:00.000Z"),
    "totalActivity": "11:22:33"
  },
  {
    "_id": "567",
    "username": "hulk_smash",
    "password": "banner123",
    "firstName": "Bruce",
    "lastName": "Banner",
    "email": "bruce@avengers.com",
    "dob": new Date("1969-12-18T00:00:00.000Z"),
    "role": "STUDENT",
    "loginId": "001234566S",
    "section": "S101",
    "lastActivity": new Date("2020-12-01T00:00:00.000Z"),
    "totalActivity": "22:33:44"
  },
  {
    "_id": "678",
    "username": "ring_bearer",
    "password": "shire123",
    "firstName": "Frodo",
    "lastName": "Baggins",
    "email": "frodo@shire.com",
    "dob": new Date("1368-09-22T00:00:00.000Z"),
    "role": "FACULTY",
    "loginId": "001234567S",
    "section": "S101",
    "lastActivity": new Date("2020-12-02T00:00:00.000Z"),
    "totalActivity": "44:33:22"
  },
  {
    "_id": "789",
    "username": "strider",
    "password": "aragorn123",
    "firstName": "Aragorn",
    "lastName": "Elessar",
    "email": "aragorn@gondor.com",
    "dob": new Date("2931-03-01T00:00:00.000Z"),
    "role": "TA",
    "loginId": "001234568S",
    "section": "S101",
    "lastActivity": new Date("2020-12-04T00:00:00.000Z"),
    "totalActivity": "12:23:34"
  },
  {
    "_id": "890",
    "username": "elf_archer",
    "password": "legolas123",
    "firstName": "Legolas",
    "lastName": "Greenleaf",
    "email": "legolas@mirkwood.com",
    "dob": new Date("2879-07-15T00:00:00.000Z"),
    "role": "STUDENT",
    "loginId": "001234569S",
    "section": "S101",
    "lastActivity": new Date("2020-11-11T00:00:00.000Z"),
    "totalActivity": "21:32:43"
  },
  {
    "_id": "777",
    "username": "ada",
    "password": "123",
    "firstName": "Ada",
    "lastName": "Lovelace",
    "email": "ada@lovelace.com",
    "dob": new Date("1815-12-15T00:00:00.000Z"),
    "role": "ADMIN",
    "loginId": "002143650S",
    "section": "S101",
    "lastActivity": new Date("1852-11-27T00:00:00.000Z"),
    "totalActivity": "21:32:43"
  }
];

async function seedUsers() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(CONNECTION_STRING);
    console.log("Connected to MongoDB successfully");
    console.log("Database:", mongoose.connection.db?.databaseName);

    // Check existing users
    const existingCount = await UserModel.countDocuments();
    console.log(`\nExisting users in database: ${existingCount}`);

    // Check which old users already exist
    const existingUsers = await UserModel.find({ _id: { $in: oldUsers.map(u => u._id) } });
    const existingIds = existingUsers.map(u => u._id);
    console.log(`Old users already in database: ${existingIds.length}`);
    console.log("Existing IDs:", existingIds);

    // Filter out users that already exist
    const usersToInsert = oldUsers.filter(user => !existingIds.includes(user._id));
    
    if (usersToInsert.length === 0) {
      console.log("\n✅ All old users already exist in the database!");
      console.log("No seeding needed.");
      return;
    }

    console.log(`\nInserting ${usersToInsert.length} old users...`);
    console.log("Users to insert:", usersToInsert.map(u => u.username));

    // Insert users one by one to handle duplicates gracefully
    let inserted = 0;
    let skipped = 0;
    let errors = 0;

    for (const user of usersToInsert) {
      try {
        // Check if user already exists by username
        const existingByUsername = await UserModel.findOne({ username: user.username });
        if (existingByUsername) {
          console.log(`⚠️  User with username "${user.username}" already exists, skipping...`);
          skipped++;
          continue;
        }

        // Insert the user
        await UserModel.create(user);
        console.log(`✓ Inserted user: ${user.username} (ID: ${user._id})`);
        inserted++;
      } catch (error) {
        if (error.code === 11000) {
          // Duplicate key error
          console.log(`⚠️  User with _id "${user._id}" or username "${user.username}" already exists, skipping...`);
          skipped++;
        } else {
          console.error(`❌ Error inserting user ${user.username}:`, error.message);
          errors++;
        }
      }
    }

    console.log("\n=== SEEDING SUMMARY ===");
    console.log(`✓ Successfully inserted: ${inserted}`);
    console.log(`⚠️  Skipped (already exists): ${skipped}`);
    console.log(`❌ Errors: ${errors}`);

    // Verify final count
    const finalCount = await UserModel.countDocuments();
    console.log(`\nTotal users in database: ${finalCount}`);

    // List all usernames
    const allUsers = await UserModel.find({}, { username: 1, _id: 1, role: 1 });
    console.log("\nAll users in database:");
    allUsers.forEach(u => {
      console.log(`  - ${u.username} (${u._id}) [${u.role}]`);
    });

    console.log("\n✅ Seeding completed!");
  } catch (error) {
    console.error("❌ Seeding error:", error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log("\nDatabase connection closed.");
  }
}

// Run the seed function
seedUsers()
  .then(() => {
    console.log("\n🎉 Seed script finished successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Seed script failed:", error);
    process.exit(1);
  });

