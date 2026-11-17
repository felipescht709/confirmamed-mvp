module.exports = {
  testEnvironment: "node",
  transformIgnorePatterns: [
    "/node_modules/(?!(@langchain|@langchain/langgraph|@langchain/langgraph-checkpoint|uuid|p-queue|p-timeout|p-retry)/)"
  ],
  transform: {
    "^.+\\.[t|j]sx?$": "babel-jest"
  }
};
