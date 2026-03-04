import { sortQueriesForBucket } from "./app/utils/queryFilters";

const mockQueries = [
  {
    "Query ID": "q1",
    "Status": "A",
    "Added Date Time": "01/03/2026 10:00:00",
    "Query Description": "Query 1 (Older Added)"
  },
  {
    "Query ID": "q2",
    "Status": "A",
    "Added Date Time": "04/03/2026 10:00:00",
    "Query Description": "Query 2 (Newer Added)"
  }
];

// 1. Default sort (no custom field)
const res1 = sortQueriesForBucket(mockQueries as any, "A");
console.log("=== DEFAULT SORT (A) ===");
res1.forEach(q => console.log(q["Query ID"], q["Added Date Time"]));

// 2. Custom sort applied to all buckets: "Assignment Date Time" (which is null for these objects)
const res2 = sortQueriesForBucket(
  mockQueries as any, 
  "A", 
  "Assignment Date Time", 
  false, 
  ["ALL"]
);
console.log("=== CUSTOM SORT (Assignment Date, ALL) ===");
res2.forEach(q => console.log(q["Query ID"], q["Added Date Time"]));
