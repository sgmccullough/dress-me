-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "stravaActivityId" TEXT NOT NULL,
    "activityName" TEXT NOT NULL,
    "activityDate" DATETIME NOT NULL,
    "temperature" REAL,
    "feelsLike" REAL,
    "windSpeed" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActivityLogItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activityLogId" TEXT NOT NULL,
    "clothingItemId" TEXT NOT NULL,
    CONSTRAINT "ActivityLogItem_activityLogId_fkey" FOREIGN KEY ("activityLogId") REFERENCES "ActivityLog" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ActivityLogItem_clothingItemId_fkey" FOREIGN KEY ("clothingItemId") REFERENCES "ClothingItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ActivityLog_userId_stravaActivityId_key" ON "ActivityLog"("userId", "stravaActivityId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityLogItem_activityLogId_clothingItemId_key" ON "ActivityLogItem"("activityLogId", "clothingItemId");
