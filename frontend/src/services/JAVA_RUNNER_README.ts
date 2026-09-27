// ────────────────────────────────────────────────────────────────────────────
// README — Java execution flow
//
// ARCHITECTURE:
//
//   User Java source
//     → (1) CheerpJ loads ECJ from /java/ecj.jar
//     → (2) ECJ compiles .java → .class inside CheerpJ virtual FS
//     → (3) CheerpJ executes Runner class (which contains the test harness)
//     → (4) stdout from Runner parsed into per-case JSON
//     → (5) Result returned to Workspace UI
//
// FALLBACK:
//   If CheerpJ inline compilation fails (e.g. browser blocks CDN, or first run),
//   the frontend falls back to POST /api/compile which returns base64 bytecode,
//   then executes the bytecode through CheerpJ.
//
// LANGUAGE SUPPORT:
//   CheerpJ 4 targets JDK 8 (Java 8) source/target compatibility via ECJ.
//   Display this clearly to the user: "Java 8 (CheerpJ)"
//
// LICENSING:
//   CheerpJ free tier: non-commercial use only.
//   Commercial license required for production at scale — contact Leaning Technologies.
//   ECJ (Eclipse Compiler for Java): EPL license (free to use commercially).
// ────────────────────────────────────────────────────────────────────────────
