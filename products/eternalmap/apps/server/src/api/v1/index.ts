import { Router } from "express";
import cemeteriesRouter from "./cemeteries/router";
import sectionsRouter from "./sections/router";
import plotsRouter from "./plots/router";
import gravesRouter from "./graves/router";
import personsRouter from "./persons/router";
import photosRouter from "./photos/router";
import syncRouter from "./sync/router";
import reportsRouter from "./reports/router";

const v1Router = Router();

v1Router.use("/cemeteries", cemeteriesRouter);
v1Router.use("/sections", sectionsRouter);
v1Router.use("/plots", plotsRouter);
v1Router.use("/graves", gravesRouter);
v1Router.use("/persons", personsRouter);
v1Router.use("/photos", photosRouter);
v1Router.use("/sync", syncRouter);
v1Router.use("/reports", reportsRouter);

export default v1Router;
