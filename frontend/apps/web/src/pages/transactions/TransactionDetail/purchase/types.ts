import { PositionValidator } from "@abrechnung/types";
import { typeToFlattenedError, z } from "zod";

export type PositionValidationError = typeToFlattenedError<z.infer<typeof PositionValidator>>;
export type ValidationErrors = {
    [positionId: number]: PositionValidationError;
};
