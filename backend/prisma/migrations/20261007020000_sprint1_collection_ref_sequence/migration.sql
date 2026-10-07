-- CreateTable
CREATE TABLE "CollectionSequence" (
    "year" INTEGER NOT NULL,
    "last" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CollectionSequence_pkey" PRIMARY KEY ("year")
);

-- Seed each year's counter from existing reference numbers so new refs never collide
INSERT INTO "CollectionSequence" ("year", "last")
SELECT CAST(SUBSTRING("collectionRefNo" FROM 5 FOR 4) AS INTEGER) AS y,
       MAX(CAST(SUBSTRING("collectionRefNo" FROM 10) AS INTEGER))
FROM "Collection"
WHERE "collectionRefNo" ~ '^COL-[0-9]{4}-[0-9]+$'
GROUP BY y;
