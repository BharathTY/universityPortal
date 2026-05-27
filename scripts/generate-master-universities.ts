import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

/** Generate master-universities.json with 1,386+ records for seeding. */
const STATES: { name: string; code: string; districts: string[] }[] = [
  { name: "Karnataka", code: "KA", districts: ["Bengaluru Urban", "Mysuru", "Belagavi", "Hubballi", "Mangaluru", "Kalaburagi"] },
  { name: "Maharashtra", code: "MH", districts: ["Mumbai", "Pune", "Nagpur", "Nashik", "Thane", "Aurangabad"] },
  { name: "Tamil Nadu", code: "TN", districts: ["Chennai", "Coimbatore", "Madurai", "Salem", "Tiruchirappalli", "Erode"] },
  { name: "Telangana", code: "TG", districts: ["Hyderabad", "Warangal", "Karimnagar", "Nizamabad", "Khammam"] },
  { name: "Andhra Pradesh", code: "AP", districts: ["Visakhapatnam", "Vijayawada", "Guntur", "Tirupati", "Kurnool"] },
  { name: "Kerala", code: "KL", districts: ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam"] },
  { name: "Delhi", code: "DL", districts: ["New Delhi", "South Delhi", "North Delhi", "East Delhi", "West Delhi"] },
  { name: "Uttar Pradesh", code: "UP", districts: ["Lucknow", "Kanpur", "Varanasi", "Agra", "Noida", "Ghaziabad"] },
  { name: "Gujarat", code: "GJ", districts: ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Gandhinagar"] },
  { name: "Rajasthan", code: "RJ", districts: ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer"] },
  { name: "West Bengal", code: "WB", districts: ["Kolkata", "Howrah", "Siliguri", "Durgapur", "Asansol"] },
  { name: "Punjab", code: "PB", districts: ["Chandigarh", "Ludhiana", "Amritsar", "Jalandhar", "Patiala"] },
  { name: "Haryana", code: "HR", districts: ["Gurugram", "Faridabad", "Panipat", "Ambala", "Rohtak"] },
  { name: "Madhya Pradesh", code: "MP", districts: ["Bhopal", "Indore", "Gwalior", "Jabalpur", "Ujjain"] },
  { name: "Bihar", code: "BR", districts: ["Patna", "Gaya", "Muzaffarpur", "Bhagalpur", "Darbhanga"] },
  { name: "Odisha", code: "OD", districts: ["Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur"] },
  { name: "Assam", code: "AS", districts: ["Guwahati", "Dibrugarh", "Silchar", "Jorhat", "Tezpur"] },
  { name: "Jharkhand", code: "JH", districts: ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Deoghar"] },
  { name: "Chhattisgarh", code: "CG", districts: ["Raipur", "Bhilai", "Bilaspur", "Korba", "Durg"] },
  { name: "Himachal Pradesh", code: "HP", districts: ["Shimla", "Dharamshala", "Mandi", "Solan", "Kangra"] },
];

const TYPES = ["PRIVATE", "DEEMED", "STATE_GOVT"] as const;
const PREFIXES = ["Institute of", "College of", "School of", "Academy of", "Centre for"];

function main() {
  const records: object[] = [];
  let id = 1;
  while (records.length < 1386) {
    for (const st of STATES) {
      for (const dist of st.districts) {
        if (records.length >= 1386) break;
        const type = TYPES[id % TYPES.length];
        const prefix = PREFIXES[id % PREFIXES.length];
        const name = `${prefix} Technology & Management, ${dist}`;
        records.push({
          externalId: `MU-${String(id).padStart(5, "0")}`,
          name,
          shortname: `ITM-${st.code}${id % 100}`,
          state: st.name,
          stateCode: st.code,
          district: dist,
          address: `${dist}, ${st.name}, India`,
          city: dist,
          pincode: String(560000 + (id % 90000)),
          website: `https://university-${id}.edu.in`,
          universityType: type,
          priority: id % 20 === 0,
        });
        id++;
      }
    }
  }

  const outDir = path.join(process.cwd(), "prisma", "data");
  mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, "master-universities.json");
  writeFileSync(out, JSON.stringify(records, null, 0));
  console.log(`Wrote ${records.length} master universities to ${out}`);
}

main();
