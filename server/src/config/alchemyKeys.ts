export function getAlchemyKeys(): string[] {
  const keys = Object.entries(process.env)
    .filter(([name, value]) => {
      return (
        /^ALCHEMY_API_KEY_\d+$/.test(name) &&
        typeof value === "string" &&
        value.trim().length > 0
      );
    })
    .sort(([a], [b]) => {
      const indexA = Number(a.split("_").pop());
      const indexB = Number(b.split("_").pop());
      return indexA - indexB;
    })
    .map(([, value]) => value!.trim());

  if (keys.length === 0) {
    throw new Error("No Alchemy API keys configured");
  }

  return keys;
}
