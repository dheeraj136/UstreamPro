import handler from "../server.mjs";

export default async function (req, res) {
  return await handler(req, res);
}
