// import Neode from "neode";
// import Contact from "~/db/graph/models/Contact";
//
// const connectionString = `${process.env.ONGDB_PROTOCOL}://${process.env.ONGDB_HOST}:${process.env.ONGDB_PORT}`;
//
// export const ongdb = new Neode(connectionString, process.env.ONGDB_USERNAME!, process.env.ONGDB_PASSWORD!, true, undefined, {
//     NEO4J_ENCRYPTED: process.env.ONGDB_ENCRYPTED!
// }).with({
//     contact: Contact,
// })