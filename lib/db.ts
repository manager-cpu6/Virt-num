// Numelixa uses MongoDB as its single persistent storage layer.
// Keep this file as a compatibility re-export so future imports do not accidentally
// bring the old PostgreSQL/pg implementation back into the application.
export {collection,getMongoDb,getMongoClient,mongoId} from "./mongo";
