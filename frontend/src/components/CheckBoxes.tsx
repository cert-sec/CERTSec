import {
  Requirement,
  UserResponses,
} from "@/pages/certification/technical-baseline";
import { Box, Checkbox, TableCell, Tooltip } from "@mui/material";

type CheckBoxesProps = {
  requirement: Requirement;
  handleUserResponseChange: (id: number, response: "yes" | "no") => void;
  userResponses: UserResponses;
};

const CheckBoxes = (props: CheckBoxesProps) => {
  const { requirement, handleUserResponseChange, userResponses } = props;

  return (
    <>
      <TableCell align="right" style={{ width: "80px" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "end",
          }}
        >
          <Checkbox
            checked={userResponses[requirement.id] === "yes"}
            onChange={() => handleUserResponseChange(requirement.id, "yes")}
          />
        </Box>
      </TableCell>
      <TableCell align="center" style={{ width: "80px" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "end",
          }}
        >
          <Checkbox
            checked={userResponses[requirement.id] === "no"}
            onChange={() => handleUserResponseChange(requirement.id, "no")}
          />
        </Box>
      </TableCell>
    </>
  );
};

export default CheckBoxes;
