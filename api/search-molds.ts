import { searchMolds } from "../src/server/searchMolds";

// Vercel serverless function equivalent of the local Express route in
// server.ts. Both share the searchMolds() logic so behavior stays identical
// between `npm run dev` and a Vercel deployment.
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { query } = req.body || {};
  if (!query) {
    res.status(400).json({ error: "O termo de busca é obrigatório." });
    return;
  }

  const result = await searchMolds(query);
  res.status(200).json(result);
}
