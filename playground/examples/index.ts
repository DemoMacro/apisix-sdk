// Export all examples
export { basicUsageExample } from "./basic-usage";
export { advancedFeaturesExample } from "./advanced-features";
export { pluginExamples } from "./plugin-examples";

// Main example runner
async function runAllExamples() {
  console.log("🚀 Running all APISIX SDK examples...\n");

  const { basicUsageExample } = await import("./basic-usage");
  const { advancedFeaturesExample } = await import("./advanced-features");
  const { pluginExamples } = await import("./plugin-examples");

  try {
    await basicUsageExample();
    console.log(`\n${"=".repeat(50)}\n`);

    await advancedFeaturesExample();
    console.log(`\n${"=".repeat(50)}\n`);

    await pluginExamples();

    console.log("\n🎉 All examples completed successfully!");
  } catch (error) {
    console.error("❌ Error running examples:", error);
  }
}

export { runAllExamples };

// Run if called directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}
