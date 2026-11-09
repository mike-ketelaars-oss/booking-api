
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export const resources = {
  users: {
    model: "user",
    required: [
      "username",
      "password",
      "name",
      "email",
      "phoneNumber",
      "pictureUrl",
    ],
    fields: [
      "username",
      "password",
      "name",
      "email",
      "phoneNumber",
      "pictureUrl",
    ],
    filters: ["username", "email"],
  },
  hosts: {
    model: "host",
    required: [
      "username",
      "password",
      "name",
      "email",
      "phoneNumber",
      "pictureUrl",
      "aboutMe",
    ],
    fields: [
      "username",
      "password",
      "name",
      "email",
      "phoneNumber",
      "pictureUrl",
      "aboutMe",
    ],
    filters: ["name"],
  },
  properties: {
    model: "property",
    required: [
      "title",
      "description",
      "location",
      "pricePerNight",
      "bedroomCount",
      "bathRoomCount",
      "maxGuestCount",
      "hostId",
      "rating",
    ],
    fields: [
      "title",
      "description",
      "location",
      "pricePerNight",
      "bedroomCount",
      "bathRoomCount",
      "maxGuestCount",
      "hostId",
      "rating",
    ],
    filters: ["location", "pricePerNight"],
  },
  bookings: {
    model: "booking",
    required: [
      "userId",
      "propertyId",
      "checkinDate",
      "checkoutDate",
      "numberOfGuests",
      "totalPrice",
      "bookingStatus",
    ],
    fields: [
      "userId",
      "propertyId",
      "checkinDate",
      "checkoutDate",
      "numberOfGuests",
      "totalPrice",
      "bookingStatus",
    ],
    filters: ["userId"],
  },
  reviews: {
    model: "review",
    required: [
      "userId",
      "propertyId",
      "rating",
      "comment",
    ],
    fields: [
      "userId",
      "propertyId",
      "rating",
      "comment",
    ],
    filters: [],
  },
};

export function clean(resource, value) {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => clean(resource, item));
  }

  if (resource === "users" || resource === "hosts") {
    const { password, ...safeData } = value;
    return safeData;
  }

  return value;
}

export function prepare(resource, body, partial = false) {
  const config = resources[resource];

  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    throw Object.assign(
      new Error("Invalid request body"),
      { status: 400 }
    );
  }

  if (
    !partial &&
    config.required.some(
      (key) =>
        body[key] === undefined ||
        body[key] === null ||
        body[key] === ""
    )
  ) {
    throw Object.assign(
      new Error("Missing required fields"),
      { status: 400 }
    );
  }

  const data = {};

  const numericFields = [
    "pricePerNight",
    "totalPrice",
    "rating",
    "bedroomCount",
    "bathRoomCount",
    "maxGuestCount",
    "numberOfGuests",
  ];

  const decimalFields = [
    "pricePerNight",
    "totalPrice",
  ];

  const dateFields = [
    "checkinDate",
    "checkoutDate",
  ];

  for (const [key, value] of Object.entries(body)) {
    if (!config.fields.includes(key)) {
      continue;
    }

    if (value === null || value === "") {
      throw Object.assign(
        new Error(`Invalid ${key}`),
        { status: 400 }
      );
    }

    if (numericFields.includes(key)) {
      const allowsDecimal =
        decimalFields.includes(key) ||
        (resource === "properties" && key === "rating");

      if (
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        (!allowsDecimal && !Number.isInteger(value))
      ) {
        throw Object.assign(
          new Error(`Invalid ${key}`),
          { status: 400 }
        );
      }
    } else if (dateFields.includes(key)) {
      if (
        typeof value !== "string" ||
        Number.isNaN(Date.parse(value))
      ) {
        throw Object.assign(
          new Error(`Invalid ${key}`),
          { status: 400 }
        );
      }

      data[key] = new Date(value);
      continue;
    } else if (typeof value !== "string") {
      throw Object.assign(
        new Error(`Invalid ${key}`),
        { status: 400 }
      );
    }

    data[key] = value;
  }

  if (partial && Object.keys(data).length === 0) {
    throw Object.assign(
      new Error("No fields to update"),
      { status: 400 }
    );
  }

  return data;
}
