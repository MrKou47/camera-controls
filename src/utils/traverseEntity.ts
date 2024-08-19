import { Entity } from "@galacean/engine";

export const traverseEntity = (entity: Entity, callback: (entity: Entity) => any) => {
  callback(entity);
  for (const child of entity.children) {
    traverseEntity(child, callback);
  }
};