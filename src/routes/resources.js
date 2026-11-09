
import { Router } from "express";
import {
  resources,
  prisma,
  clean,
  prepare,
} from "../services/resources.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

const asyncRoute = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

for (const [resource, config] of Object.entries(resources)) {
  const database = prisma[config.model];

  router.get(
    `/${resource}`,
    asyncRoute(async (req, res) => {
      const where = {};

      for (const key of config.filters) {
        if (req.query[key] !== undefined) {
          let value = req.query[key];

          if (key === "pricePerNight") {
            value = Number(value);

            if (!Number.isFinite(value)) {
              return res.status(400).json({
                message: "Invalid pricePerNight",
              });
            }
          }

          where[key] = value;
        }
      }

      const items = await database.findMany({ where });

      return res.status(200).json(clean(resource, items));
    })
  );

  router.get(
    `/${resource}/:id`,
    asyncRoute(async (req, res) => {
      const item = await database.findUnique({
        where: { id: req.params.id },
      });

      if (!item) {
        return res.status(404).json({
          message: "Resource not found",
        });
      }

      return res.status(200).json(clean(resource, item));
    })
  );

  router.post(
    `/${resource}`,
    authenticate,
    asyncRoute(async (req, res) => {
      const data = prepare(resource, req.body);

      const item = await database.create({ data });

      return res.status(201).json(clean(resource, item));
    })
  );

  router.put(
    `/${resource}/:id`,
    authenticate,
    asyncRoute(async (req, res) => {
      const existing = await database.findUnique({
        where: { id: req.params.id },
      });

      if (!existing) {
        return res.status(404).json({
          message: "Resource not found",
        });
      }

      const data = prepare(resource, req.body, true);

      const item = await database.update({
        where: { id: req.params.id },
        data,
      });

      return res.status(200).json(clean(resource, item));
    })
  );

  router.delete(
    `/${resource}/:id`,
    authenticate,
    asyncRoute(async (req, res) => {
      const existing = await database.findUnique({
        where: { id: req.params.id },
      });

      if (!existing) {
        return res.status(404).json({
          message: "Resource not found",
        });
      }

      await database.delete({
        where: { id: req.params.id },
      });

      return res.status(200).json({
        message: "Deleted successfully",
      });
    })
  );
}

export default router;
