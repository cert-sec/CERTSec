import React, { FC } from "react";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

type Props = {
  title: string;
  headers: string[];
  data: any[];
  renderRow: (item: any, index: number) => JSX.Element | JSX.Element[];
};

const AssessmentTable = (props: Props) => {
  const { title, headers, data, renderRow } = props;
  console.log("data", data);
  return (
    <Box
      sx={{
        marginBottom: 3,
        borderRadius: "10px",
        padding: 2,
        backgroundColor: "#fff",
        marginTop: 1,
      }}
    >
      <Typography variant="h6" gutterBottom sx={{ fontSize: "16px" }}>
        {title}
      </Typography>
      <TableContainer component={Paper} sx={{ borderRadius: "10px" }}>
        <Table sx={{ marginBottom: "30px" }}>
          <TableHead>
            <TableRow>
              {headers.map((header, index) => (
                <TableCell key={index}>{header}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>{data && data.flatMap(renderRow)}</TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default AssessmentTable;
