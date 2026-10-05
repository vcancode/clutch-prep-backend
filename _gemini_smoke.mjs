import { analyzeExamText, generateQuiz } from "./utils/Gemini.js";

const examText = `
1. Explain the working of different types of SQL JOIN operations with suitable examples.
2. Normalise the given relational schema into Third Normal Form and justify each transformation step.
3. Describe ACID properties of transactions with a suitable banking application example.
4. Write an SQL query to find the second highest salary from an employee table using a subquery.
5. Explain the difference between DELETE, TRUNCATE and DROP commands with examples.
6. Describe the indexing techniques used in database systems and their impact on query performance.
7. Explain normalisation anomalies with a suitable example and show how 2NF removes them.
8. Write a query using GROUP BY and HAVING clause to list departments having more than five employees.
9. Explain deadlock handling strategies in operating system transaction scheduling.
10. Describe the roles of primary key, foreign key and candidate key with a suitable example.
11. Explain how a B+ tree index accelerates range queries in a large database table.
12. Write an SQL query to find all employees whose names start with the letter A using pattern matching.
13. Explain CPU scheduling algorithms including round robin and shortest job first with examples.
14. Describe the purpose of paging in memory management and how page tables are maintained.
15. Explain the difference between process and thread with a suitable multithreading example.
16. Describe virtual memory and page replacement algorithms such as LRU and FIFO.
17. Explain segmentation in memory management with a suitable address translation example.
18. Describe file allocation methods including contiguous, linked and indexed allocation.
19. Explain disk scheduling algorithms such as SCAN, C-SCAN and LOOK with examples.
20. Describe the producer consumer problem and how semaphores solve it.
21. Explain the bootstrapping process and role of the BIOS in system startup.
22. Describe threading models and the role of thread libraries in concurrent programming.
23. Explain the concept of thrashing and how the working set model prevents it.
24. Write an SQL query to join three tables and display student enrolment records.
25. Explain transaction isolation levels and the anomalies each level prevents.
26. Describe view concepts in databases and the difference between simple and complex views.
27. Explain triggers and stored procedures with a suitable SQL example.
28. Describe the recovery techniques including logging and shadow paging.
29. Explain concurrency control protocols using two phase locking.
30. Describe the role of a database administrator and client server architectures.
`;

console.log("model:", process.env.GEMINI_MODEL);

console.time("analysis");
const analysis = await analyzeExamText(examText, "");
console.timeEnd("analysis");
console.log("subject:", analysis.subject);
console.log("TOPIC COUNT:", analysis.topics.length, "| required >= 15");
console.log("zod checks:", analysis.topics.every(t =>
  t.question_types.length >= 3 && t.side_topics.length <= 3 &&
  ["high","medium","low"].includes(t.priority) &&
  ["easy","moderate","hard"].includes(t.difficulty)
));

await new Promise(r => setTimeout(r, 25000));

console.time("quiz");
const quiz = await generateQuiz(analysis);
console.timeEnd("quiz");
console.log("QUIZ COUNT:", quiz.quiz.length, "| required >= 15");
console.log("difficulties:", [...new Set(quiz.quiz.map(q => q.difficulty))].join(", "));
console.log("answerIndex valid:", quiz.quiz.every(q => q.answerIndex >= 0 && q.answerIndex <= 3));
console.log("unique questions:", new Set(quiz.quiz.map(q => q.question)).size === quiz.quiz.length);
