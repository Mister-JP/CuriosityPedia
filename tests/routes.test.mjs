import assert from "node:assert/strict";
import test from "node:test";
import {
  journeyMapPath,
  journeyStagePath,
  parseWonderDriveRoute,
  staticRoutePath,
} from "../app/routes.ts";

test("parses stable product routes", () => {
  assert.deepEqual(parseWonderDriveRoute("/"), { name: "start" });
  assert.deepEqual(parseWonderDriveRoute("/library/"), { name: "library" });
  assert.deepEqual(parseWonderDriveRoute("/bookmarks"), { name: "bookmarks" });
  assert.deepEqual(parseWonderDriveRoute("/usage"), { name: "usage" });
  assert.deepEqual(parseWonderDriveRoute("/settings"), { name: "settings" });
});

test("round trips journey stage and map routes", () => {
  const stagePath = journeyStagePath("journey/one", "turn two");
  assert.equal(stagePath, "/journeys/journey%2Fone/turns/turn%20two");
  assert.deepEqual(parseWonderDriveRoute(stagePath), {
    name: "journey",
    journeyId: "journey/one",
    turnId: "turn two",
    surface: "stage",
  });

  const mapPath = journeyMapPath("journey-1", "turn-2");
  assert.equal(mapPath, "/journeys/journey-1/map?turn=turn-2");
  assert.deepEqual(parseWonderDriveRoute("/journeys/journey-1/map", "?turn=turn-2"), {
    name: "journey",
    journeyId: "journey-1",
    turnId: "turn-2",
    surface: "map",
  });
});

test("rejects paths outside the product route contract", () => {
  assert.equal(parseWonderDriveRoute("/journeys"), null);
  assert.equal(parseWonderDriveRoute("/journeys/id/unknown"), null);
  assert.equal(parseWonderDriveRoute("/not-a-route"), null);
  assert.equal(staticRoutePath("start"), "/");
  assert.equal(staticRoutePath("library"), "/library");
  assert.equal(staticRoutePath("bookmarks"), "/bookmarks");
});
