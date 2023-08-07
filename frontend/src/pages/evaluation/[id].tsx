import apiClient from "@/lib/apiClient";
import { GetServerSideProps } from "next";
import { Requirement } from "../certification/technical-baseline";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  List,
  ListItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { ExpandMore } from "@mui/icons-material";
import { groupBy } from "lodash";
import { useTasksData } from "@/lib/context/TaskDataContext";
import React, { useState } from "react";
import AssessmentTable from "@/components/AssessmentTable";
import { useCertificate } from "@/lib/context/CertificatesContext";
import { AutomatedRequirementType } from "@/lib/enums/enums";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import DescriptionIcon from "@mui/icons-material/Description";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { downloadObjectAsJson } from "@/lib/utils/download";
import { generateIdForOpenPort } from "@/lib/utils/utils";
import CircularProgress from "@mui/material/CircularProgress";
import { NEXT_CERTIFICATE } from "@/lib/utils/constants";
import { useRouter } from "next/router";

type AssessmentRequirement = {
  assessment: number;
  requirement: Requirement;
  fulfilled: boolean;
};

type Assessment = {
  id: number;
  company: number;
  certificate: number;
  passed: boolean;
  attempted_at: string;
  valid_until: string | null;
  assessment_requirements: AssessmentRequirement[];
};

const EvaluationPage = ({
  assessment,
  openPorts,
  additionalRequirementResponses,
}) => {
  const { tasksData } = useTasksData();
  const router = useRouter();
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  console.log("Evaluation - assessment: ", assessment);
  console.log("Certificate: ", assessment.certificate);
  console.log("Context - tasksData: ", tasksData);
  console.log("Evaluation - openPorts: ", openPorts);
  console.log(
    "Evaluation - additionalRequirementResponses: ",
    additionalRequirementResponses
  );

  const generateReport = async () => {
    if (assessment.passed) {
      return;
    }

    try {
      setIsGeneratingReport(true);
      const response = await apiClient.post(
        `/assessments/${assessment.id}/report/`,
        {},
        { responseType: "blob" } // This ensures that the response data is treated as a Blob
      );

      // Create a blob from the response data and create an object URL for it
      const url = window.URL.createObjectURL(new Blob([response.data]));

      // Create a link element and set the href to the object URL, and download attribute to the filename you want
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "recommendations.pdf");

      // Append the link to the document body and click it to trigger the download, then remove the link element
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setIsGeneratingReport(false);
    } catch (error) {
      setIsGeneratingReport(false);
      console.log("Something went wrong during report generation: ", error);
    }
  };

  const exportData = () => {
    if (!tasksData) {
      return;
    }

    let data: Record<string, any> = {};
    Object.entries(tasksData).forEach(([key, value]: [string, any]) => {
      if (key === AutomatedRequirementType.VULNERABILITY_CHECKER) {
        let tmpDir: Record<string, any> = {};
        tmpDir["ipVulnerabilities"] = value["ipVulnerabilities"]["result"];
        tmpDir["technologyVulnerabilities"] =
          value["technologyVulnerabilities"]["result"];
        data[key] = tmpDir;
      } else if (key === AutomatedRequirementType.HTTPS_PROTOCOL_CHECKER) {
        data[key] = value["httpsCheck"]["result"];
      } else if (key === AutomatedRequirementType.UNAUTHORIZED_ACCESS_CHECKER) {
        let tmpDir: Record<string, any> = {};
        tmpDir["pingCheck"] = value["pingCheck"]["result"];
        tmpDir["portScan"] = value["portScan"]["result"];
        data[key] = tmpDir;
      }
    });

    const date = new Date();
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed in JavaScript
    const year = date.getFullYear();

    const fileName = `automated_assessment_results_${day}_${month}_${year}`;

    downloadObjectAsJson(data, fileName);
  };

  const formatDate = (date: string | null) => {
    if (!date) {
      return null;
    }

    const dateObj = new Date(date);
    return dateObj.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const categories = groupBy(
    assessment.assessment_requirements,
    (assmtReq) => assmtReq.requirement.category.id
  );

  const tasksDataExists = tasksData && Object.keys(tasksData).length !== 0;
  console.log("tasksDataExists: ", tasksDataExists);

  console.log("tasksData: ", tasksData);

  const startNextCertification = () => {
    if (!assessment.passed) {
      return;
    }

    if (
      assessment.certificate.next_certificate.name ===
      NEXT_CERTIFICATE.COST_AWARE_BASELINE
    ) {
      router.push("/certification/cost-aware-baseline");
    } else if (
      assessment.certificate.next_certificate.name ===
      NEXT_CERTIFICATE.COMPREHENSIVE_BASELINE
    ) {
      router.push("/certification/comprehensive-baseline");
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{
        padding: 3,
        margin: 3,
        fontFamil: "Arial",
        borderRadius: "15px",
        backgroundColor: "#f5f5f5",
      }}
    >
      <Box display="flex">
        <Typography
          variant="h4"
          gutterBottom
          component="div"
          sx={{
            paddingRight: 2,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          Evaluation for {assessment.certificate.name} Certification
        </Typography>
        <Chip
          label={assessment.passed ? "Passed" : "Failed"}
          color={assessment.passed ? "success" : "error"}
          variant="outlined"
          sx={{ marginTop: 1, marginBottom: 1, fontSize: "16px" }}
        />
      </Box>
      <Box
        sx={{
          borderBottom: "1px solid #ccc",
          paddingBottom: 2,
          marginBottom: 3,
          display: "flex",
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" component="div">
            Company: {assessment.company.name}
          </Typography>
          <Typography
            variant="subtitle1"
            color={assessment.passed ? "success" : "error"}
            component="div"
          >
            Status: {assessment.passed ? "Passed" : "Not Passed"}
          </Typography>
          <Typography variant="body1" component="div">
            Attempted at: {formatDate(assessment.attempted_at)}
          </Typography>
          <Typography variant="body1" component="div">
            Valid until: {formatDate(assessment.valid_until) || "N/A"}
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
          }}
        >
          {assessment.certificate.name === "Technical Baseline" && (
            <Tooltip
              title="The data from the automated assessment is not available anymore. Please conduct the assessment again and do not refresh the page"
              disableHoverListener={tasksDataExists}
              disableFocusListener={tasksDataExists}
              disableTouchListener={tasksDataExists}
            >
              <div
                style={{
                  cursor:
                    tasksData && Object.keys(tasksData).length !== 0
                      ? "pointer"
                      : "not-allowed",
                }}
              >
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => exportData()}
                  sx={{
                    marginBottom: 2,
                    minWidth: 180,
                    display: "flex",
                    alignItems: "center",
                    color: "#fff",
                  }}
                  style={{
                    backgroundColor: tasksDataExists ? "#1769aa" : "#0f4c81",
                    color: tasksDataExists ? "#fff" : "#e0e0e0",
                    cursor: tasksDataExists ? "pointer" : "not-allowed",
                  }}
                  size="small"
                  disabled={!tasksDataExists}
                >
                  <Box
                    sx={{
                      width: 30,
                      marginRight: 1,
                      display: "flex",
                      justifyContent: "center",
                    }}
                  >
                    <CloudDownloadIcon />
                  </Box>
                  Export Data
                </Button>
              </div>
            </Tooltip>
          )}
          {!assessment.passed && (
            <Button
              variant="contained"
              onClick={generateReport}
              sx={{
                marginBottom: 2,
                minWidth: 180,
                backgroundColor: "#f44336",
                display: "flex",
                alignItems: "center",
                color: "#fff",
              }}
              style={{ backgroundColor: "#1769aa" }}
              size="small"
            >
              <Box
                sx={{
                  width: 30,
                  marginRight: 1,
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                {isGeneratingReport ? (
                  <CircularProgress
                    size={24}
                    sx={{
                      position: "absolute",
                      // top: "50%",
                      // left: "50%",
                      marginTop: "-12px",
                      paddingLeft: "2px",
                      color: "#fff",
                    }}
                  />
                ) : (
                  <DescriptionIcon />
                )}
              </Box>
              {isGeneratingReport ? "Generating Report..." : "Generate Report"}
            </Button>
          )}
          {assessment.certificate.name !== "Comprehensive Baseline" && (
            <Tooltip
              title={`You can only proceed to the ${assessment.certificate.next_certificate.name} Certification if you pass the ${assessment.certificate.name} Certification.`}
              disableHoverListener={assessment.passed}
              disableFocusListener={assessment.passed}
              disableTouchListener={assessment.passed}
            >
              <div
                style={{
                  cursor: assessment.passed ? "pointer" : "not-allowed",
                }}
              >
                <Button
                  variant="contained"
                  size="small"
                  sx={{
                    minWidth: 180,
                    display: "flex",
                    justifyContent: "space-between",
                    color: "#fff",
                    cursor: assessment.passed ? "pointer" : "not-allowed",
                  }}
                  style={{
                    backgroundColor: assessment.passed ? "#1769aa" : "#0f4c81",
                    color: assessment.passed ? "#fff" : "#e0e0e0",
                    cursor: assessment.passed ? "pointer" : "not-allowed",
                  }}
                  onClick={startNextCertification}
                  disabled={!assessment.passed}
                >
                  <Box
                    sx={{
                      width: 30,
                      marginRight: 1,
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <ArrowForwardIcon />
                  </Box>
                  Next Certification
                </Button>
              </div>
            </Tooltip>
          )}
        </Box>
      </Box>

      <Typography
        variant="h5"
        gutterBottom
        component="div"
        sx={{ marginBottom: 2 }}
      >
        Results:
      </Typography>

      {Object.values(categories).map(
        (categoryAssessments: AssessmentRequirement[], index) => {
          const lastCategory = index === Object.values(categories).length - 1;
          return (
            <Box
              key={index}
              sx={{
                marginBottom: 3,
                backgroundColor: "#fff",
                padding: 2,
                borderRadius: "10px",
              }}
            >
              <Typography variant="h6" gutterBottom component="div">
                Category: {categoryAssessments[0].requirement.category.name}
              </Typography>

              <TableContainer component={Paper} sx={{ borderRadius: "10px" }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Description</TableCell>
                      <TableCell align="right">Fulfilled</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {categoryAssessments.map((assessmentReq, rowIndex) => {
                      return (
                        <TableRow
                          key={rowIndex}
                          sx={{
                            backgroundColor: assessmentReq.fulfilled
                              ? "rgba(76, 175, 80, 0.1)"
                              : "rgba(244, 67, 54, 0.1)",
                          }}
                        >
                          <TableCell>
                            {assessmentReq.requirement
                              .is_automated_requirement ? (
                              <Accordion sx={{ boxShadow: "none" }}>
                                <AccordionSummary expandIcon={<ExpandMore />}>
                                  <Typography variant="body2" component="span">
                                    {assessmentReq.requirement.description}
                                  </Typography>
                                </AccordionSummary>
                                <AccordionDetails
                                  sx={{ flexDirection: "column" }}
                                >
                                  {assessmentReq.requirement
                                    .automated_requirement_type ===
                                    AutomatedRequirementType.HTTPS_PROTOCOL_CHECKER && (
                                    <Box
                                      sx={{
                                        marginBottom: 3,
                                        borderRadius: "10px",
                                        padding: 2,
                                        backgroundColor: "#fff",
                                        marginTop: 1,
                                      }}
                                    >
                                      <Typography
                                        variant="h6"
                                        gutterBottom
                                        sx={{ fontSize: "18px", pb: 2 }}
                                      >
                                        Automated Assessment Results
                                      </Typography>
                                      <TableContainer
                                        component={Paper}
                                        sx={{
                                          borderRadius: "10px",
                                          marginBottom: 2,
                                        }}
                                      >
                                        <Table>
                                          <TableHead>
                                            <TableRow>
                                              {assessmentReq.requirement
                                                .automated_requirement_type ===
                                                AutomatedRequirementType.HTTPS_PROTOCOL_CHECKER && (
                                                <>
                                                  <TableCell>Website</TableCell>
                                                  <TableCell align="right">
                                                    Protocol
                                                  </TableCell>
                                                  <TableCell>
                                                    Description
                                                  </TableCell>
                                                </>
                                              )}
                                            </TableRow>
                                          </TableHead>
                                          <TableBody>
                                            {tasksData &&
                                            tasksData[
                                              AutomatedRequirementType
                                                .HTTPS_PROTOCOL_CHECKER
                                            ] &&
                                            tasksData[
                                              AutomatedRequirementType
                                                .HTTPS_PROTOCOL_CHECKER
                                            ]["httpsCheck"] &&
                                            tasksData[
                                              AutomatedRequirementType
                                                .HTTPS_PROTOCOL_CHECKER
                                            ]["httpsCheck"].result &&
                                            Object.keys(
                                              tasksData[
                                                AutomatedRequirementType
                                                  .HTTPS_PROTOCOL_CHECKER
                                              ]["httpsCheck"].result
                                            ).length > 0 ? (
                                              Object.entries(
                                                tasksData[
                                                  AutomatedRequirementType
                                                    .HTTPS_PROTOCOL_CHECKER
                                                ]["httpsCheck"].result
                                              ).map(
                                                (
                                                  [website, protocol],
                                                  index
                                                ) => (
                                                  <TableRow key={index}>
                                                    <TableCell>
                                                      {website}
                                                    </TableCell>
                                                    <TableCell align="right">
                                                      {protocol &&
                                                      protocol.protocol
                                                        ? protocol.protocol
                                                        : "N/A"}
                                                    </TableCell>
                                                    <TableCell>
                                                      {protocol &&
                                                      protocol.description
                                                        ? protocol.description
                                                        : protocol.error
                                                        ? protocol.error
                                                        : "N/A"}
                                                    </TableCell>
                                                  </TableRow>
                                                )
                                              )
                                            ) : (
                                              <TableRow>
                                                <TableCell
                                                  colSpan={3}
                                                  align="center"
                                                >
                                                  No data available
                                                </TableCell>
                                              </TableRow>
                                            )}
                                          </TableBody>
                                        </Table>
                                      </TableContainer>
                                    </Box>
                                  )}
                                  {assessmentReq.requirement
                                    .automated_requirement_type ===
                                    AutomatedRequirementType.UNAUTHORIZED_ACCESS_CHECKER && (
                                    <>
                                      <Box
                                        sx={{
                                          marginBottom: 3,
                                          borderRadius: "10px",
                                          padding: 2,
                                          backgroundColor: "#fff",
                                          marginTop: 1,
                                        }}
                                      >
                                        <Typography
                                          variant="h6"
                                          gutterBottom
                                          sx={{ fontSize: "18px", pb: 2 }}
                                        >
                                          Automated Assessment Results
                                        </Typography>
                                        <TableContainer
                                          component={Paper}
                                          sx={{
                                            borderRadius: "10px",
                                            marginBottom: 2,
                                          }}
                                        >
                                          <Table>
                                            <TableHead>
                                              <TableRow>
                                                <TableCell>
                                                  IP Address
                                                </TableCell>
                                                <TableCell align="center">
                                                  Connection Established
                                                </TableCell>
                                                <TableCell align="center">
                                                  Description
                                                </TableCell>
                                              </TableRow>
                                            </TableHead>
                                            <TableBody>
                                              {tasksData &&
                                              tasksData[
                                                AutomatedRequirementType
                                                  .UNAUTHORIZED_ACCESS_CHECKER
                                              ] &&
                                              tasksData[
                                                AutomatedRequirementType
                                                  .UNAUTHORIZED_ACCESS_CHECKER
                                              ]["pingCheck"] &&
                                              tasksData[
                                                AutomatedRequirementType
                                                  .UNAUTHORIZED_ACCESS_CHECKER
                                              ]["pingCheck"].result &&
                                              Object.keys(
                                                tasksData[
                                                  AutomatedRequirementType
                                                    .UNAUTHORIZED_ACCESS_CHECKER
                                                ]["pingCheck"].result
                                              ).length > 0 ? (
                                                Object.entries(
                                                  tasksData[
                                                    AutomatedRequirementType
                                                      .UNAUTHORIZED_ACCESS_CHECKER
                                                  ]["pingCheck"].result
                                                ).map(([ip, result], index) => (
                                                  <TableRow key={index}>
                                                    <TableCell>{ip}</TableCell>
                                                    <TableCell align="center">
                                                      {result &&
                                                      result.connection_established
                                                        ? result.connection_established
                                                        : "N/A"}
                                                    </TableCell>
                                                    <TableCell align="center">
                                                      {result &&
                                                      result.description
                                                        ? result.description
                                                        : "N/A"}
                                                    </TableCell>
                                                  </TableRow>
                                                ))
                                              ) : (
                                                <TableRow>
                                                  <TableCell
                                                    colSpan={3}
                                                    align="center"
                                                  >
                                                    No data available
                                                  </TableCell>
                                                </TableRow>
                                              )}
                                            </TableBody>
                                          </Table>
                                        </TableContainer>
                                      </Box>
                                      <Box
                                        sx={{
                                          marginBottom: 3,
                                          borderRadius: "10px",
                                          padding: 2,
                                          backgroundColor: "#fff",
                                          marginTop: 1,
                                        }}
                                      >
                                        <Typography
                                          variant="h6"
                                          gutterBottom
                                          sx={{ fontSize: "18px", pb: 2 }}
                                        >
                                          Manual Assessment Results
                                        </Typography>
                                        <TableContainer
                                          component={Paper}
                                          sx={{
                                            borderRadius: "10px",
                                            marginBottom: 2,
                                          }}
                                        >
                                          <Table>
                                            <TableHead>
                                              <TableRow>
                                                <TableCell>
                                                  IP Address
                                                </TableCell>
                                                <TableCell align="center">
                                                  Open Port
                                                </TableCell>
                                                <TableCell align="center">
                                                  Protection Available
                                                </TableCell>
                                              </TableRow>
                                            </TableHead>
                                            <TableBody>
                                              {openPorts &&
                                              Object.keys(openPorts).length >
                                                0 ? (
                                                Object.entries(openPorts).map(
                                                  ([ip, result], index) =>
                                                    result.map(
                                                      (result, subindex) => {
                                                        console.log(
                                                          "result: ",
                                                          result
                                                        );
                                                        console.log(
                                                          "result.portid: ",
                                                          result.portid
                                                        );
                                                        const id =
                                                          generateIdForOpenPort(
                                                            ip,
                                                            result.portid
                                                          );
                                                        console.log("id: ", id);
                                                        return (
                                                          <TableRow
                                                            key={`${index}-${subindex}`}
                                                          >
                                                            <TableCell>
                                                              {ip}
                                                            </TableCell>
                                                            <TableCell align="center">
                                                              {result &&
                                                              result.portid
                                                                ? result.portid
                                                                : "N/A"}
                                                            </TableCell>
                                                            <TableCell align="center">
                                                              {additionalRequirementResponses &&
                                                              id
                                                                ? additionalRequirementResponses[
                                                                    id
                                                                  ]
                                                                : "N/A"}
                                                            </TableCell>
                                                          </TableRow>
                                                        );
                                                      }
                                                    )
                                                )
                                              ) : (
                                                <TableRow>
                                                  <TableCell
                                                    colSpan={3}
                                                    align="center"
                                                  >
                                                    No data available
                                                  </TableCell>
                                                </TableRow>
                                              )}
                                            </TableBody>
                                          </Table>
                                        </TableContainer>
                                      </Box>
                                    </>
                                  )}
                                  {assessmentReq.requirement
                                    .automated_requirement_type ===
                                    AutomatedRequirementType.VULNERABILITY_CHECKER &&
                                    tasksData &&
                                    tasksData[
                                      AutomatedRequirementType
                                        .VULNERABILITY_CHECKER
                                    ] &&
                                    tasksData[
                                      AutomatedRequirementType
                                        .VULNERABILITY_CHECKER
                                    ]["ipVulnerabilities"] &&
                                    tasksData[
                                      AutomatedRequirementType
                                        .VULNERABILITY_CHECKER
                                    ]["ipVulnerabilities"].result && (
                                      <Box sx={{ width: "100%" }}>
                                        <Typography
                                          variant="h6"
                                          gutterBottom
                                          sx={{ fontSize: "18px", pl: 2 }}
                                        >
                                          Network Vulnerability Scan Results
                                        </Typography>
                                        <AssessmentTable
                                          title="IP Address Details"
                                          headers={[
                                            "IP Address",
                                            "Port",
                                            "Protocol",
                                            "Service Name",
                                            "Product",
                                            "Version",
                                            "Vulnerabilities",
                                          ]}
                                          data={Object.entries(
                                            tasksData[
                                              AutomatedRequirementType
                                                .VULNERABILITY_CHECKER
                                            ]["ipVulnerabilities"].result
                                          )}
                                          renderRow={(
                                            [ip, data]: [string, any],
                                            index: number
                                          ) =>
                                            Object.entries(data).map(
                                              (
                                                [port, details]: [string, any],
                                                portIndex: number
                                              ) => (
                                                <TableRow
                                                  key={`${index}-${portIndex}`}
                                                >
                                                  <TableCell>{ip} </TableCell>
                                                  <TableCell>{port}</TableCell>
                                                  <TableCell>
                                                    {details.protocol}
                                                  </TableCell>
                                                  <TableCell>
                                                    {details.service.name}
                                                  </TableCell>
                                                  <TableCell>
                                                    {details.service.product}
                                                  </TableCell>
                                                  <TableCell>
                                                    {details.service.version}
                                                  </TableCell>
                                                  <TableCell>
                                                    {details.vulnerabilities &&
                                                    Object.keys(
                                                      details.vulnerabilities
                                                    ).length > 0
                                                      ? "Yes"
                                                      : "No"}
                                                  </TableCell>
                                                </TableRow>
                                              )
                                            )
                                          }
                                        />
                                        <AssessmentTable
                                          title="Vulnerabilities Summary (nmap)"
                                          headers={[
                                            "Port",
                                            "CVE",
                                            "CVSS",
                                            "Known Exploits",
                                          ]}
                                          data={Object.entries(
                                            tasksData[
                                              AutomatedRequirementType
                                                .VULNERABILITY_CHECKER
                                            ]["ipVulnerabilities"].result
                                          )}
                                          renderRow={(
                                            [ip, data]: [string, any],
                                            index: number
                                          ) =>
                                            Object.entries(data).flatMap(
                                              ([port, details]: [
                                                string,
                                                any
                                              ]) =>
                                                Object.entries(
                                                  details.vulnerabilities
                                                ).map(
                                                  (
                                                    [cve, cveData]: [
                                                      string,
                                                      any
                                                    ],
                                                    cveIndex: number
                                                  ) => (
                                                    <TableRow
                                                      key={`${index}-${port}-${cveIndex}`}
                                                    >
                                                      <TableCell>
                                                        {port}
                                                      </TableCell>
                                                      <TableCell>
                                                        {cve}
                                                      </TableCell>
                                                      <TableCell>
                                                        {cveData.cvss}
                                                      </TableCell>
                                                      <TableCell>
                                                        {cveData.is_exploit ===
                                                        true
                                                          ? "Yes"
                                                          : "No"}
                                                      </TableCell>
                                                    </TableRow>
                                                  )
                                                )
                                            )
                                          }
                                        />
                                        <AssessmentTable
                                          title="Vulnerability Priority Details (CVE_Prioritizer)"
                                          headers={[
                                            "CVE",
                                            "Priority",
                                            "EPSS",
                                            "CVSS Base Score",
                                            "CVSS Version",
                                            "CISA KEV",
                                          ]}
                                          data={Object.entries(
                                            tasksData[
                                              AutomatedRequirementType
                                                .VULNERABILITY_CHECKER
                                            ]["ipVulnerabilities"].result
                                          )}
                                          renderRow={(
                                            [ip, data]: [string, any],
                                            index: number
                                          ) =>
                                            Object.entries(data).flatMap(
                                              ([port, details]: [
                                                string,
                                                any
                                              ]) =>
                                                Object.entries(
                                                  details.vulnerabilities
                                                ).map(
                                                  (
                                                    [cve, cveData]: [
                                                      string,
                                                      any
                                                    ],
                                                    cveIndex: number
                                                  ) =>
                                                    cveData.priority_details && (
                                                      <TableRow
                                                        key={`${index}-${port}-${cveIndex}`}
                                                      >
                                                        <TableCell>
                                                          {cve}
                                                        </TableCell>
                                                        <TableCell>
                                                          {
                                                            cveData
                                                              .priority_details
                                                              .priority
                                                          }
                                                        </TableCell>
                                                        <TableCell>
                                                          {
                                                            cveData
                                                              .priority_details
                                                              .epss
                                                          }
                                                        </TableCell>
                                                        <TableCell>
                                                          {
                                                            cveData
                                                              .priority_details
                                                              .cvss_baseScore
                                                          }
                                                        </TableCell>
                                                        <TableCell>
                                                          {
                                                            cveData
                                                              .priority_details
                                                              .cvss_version
                                                          }
                                                        </TableCell>
                                                        <TableCell>
                                                          {
                                                            cveData
                                                              .priority_details
                                                              .cisa_kev
                                                          }
                                                        </TableCell>
                                                      </TableRow>
                                                    )
                                                )
                                            )
                                          }
                                        />
                                      </Box>
                                    )}
                                  {assessmentReq.requirement
                                    .automated_requirement_type ===
                                    AutomatedRequirementType.VULNERABILITY_CHECKER &&
                                    tasksData &&
                                    tasksData[
                                      AutomatedRequirementType
                                        .VULNERABILITY_CHECKER
                                    ] &&
                                    tasksData[
                                      AutomatedRequirementType
                                        .VULNERABILITY_CHECKER
                                    ]["technologyVulnerabilities"] &&
                                    tasksData[
                                      AutomatedRequirementType
                                        .VULNERABILITY_CHECKER
                                    ]["technologyVulnerabilities"].result && (
                                      <Box sx={{ width: "100%" }}>
                                        <Typography
                                          variant="h6"
                                          gutterBottom
                                          sx={{ fontSize: "18px", pl: 2 }}
                                        >
                                          Products Vulnerability Scan Results
                                        </Typography>
                                        <AssessmentTable
                                          title="Software / Technology Details"
                                          headers={[
                                            "Product",
                                            "Version",
                                            "Vendor",
                                            "Vulnerabilities",
                                          ]}
                                          data={
                                            tasksData[
                                              AutomatedRequirementType
                                                .VULNERABILITY_CHECKER
                                            ]["technologyVulnerabilities"]
                                              .result
                                          }
                                          renderRow={(
                                            product: any,
                                            index: number
                                          ) => (
                                            <TableRow key={index}>
                                              <TableCell>
                                                {product.product}
                                              </TableCell>
                                              <TableCell>
                                                {product.version}
                                              </TableCell>
                                              <TableCell>
                                                {product.vendor}
                                              </TableCell>
                                              <TableCell>
                                                {product.vulnerabilities &&
                                                Object.keys(
                                                  product.vulnerabilities
                                                ).length > 0
                                                  ? "Yes"
                                                  : "No"}
                                              </TableCell>
                                            </TableRow>
                                          )}
                                        />

                                        <AssessmentTable
                                          title="Vulnerability Priority Details (CVE_Prioritizer)"
                                          headers={[
                                            "Product",
                                            "CVE",
                                            "Priority",
                                            "EPSS",
                                            "CVSS Base Score",
                                            "CVSS Version",
                                            "CISA KEV",
                                          ]}
                                          data={
                                            tasksData[
                                              AutomatedRequirementType
                                                .VULNERABILITY_CHECKER
                                            ]["technologyVulnerabilities"]
                                              .result
                                          }
                                          renderRow={(
                                            product: any,
                                            index: number
                                          ) =>
                                            Object.entries(
                                              product.vulnerabilities
                                            ).map(
                                              (
                                                [cve, cveData]: [string, any],
                                                cveIndex: number
                                              ) => (
                                                <TableRow
                                                  key={`${index}-${cveIndex}`}
                                                >
                                                  <TableCell>
                                                    {product.product}
                                                  </TableCell>
                                                  <TableCell>{cve}</TableCell>
                                                  <TableCell>
                                                    {cveData.priority}
                                                  </TableCell>
                                                  <TableCell>
                                                    {cveData.epss}
                                                  </TableCell>
                                                  <TableCell>
                                                    {cveData.cvss_baseScore}
                                                  </TableCell>
                                                  <TableCell>
                                                    {cveData.cvss_version}
                                                  </TableCell>
                                                  <TableCell>
                                                    {cveData.cisa_kev}
                                                  </TableCell>
                                                </TableRow>
                                              )
                                            )
                                          }
                                        />
                                      </Box>
                                    )}
                                </AccordionDetails>
                              </Accordion>
                            ) : (
                              assessmentReq.requirement.description
                            )}
                          </TableCell>
                          <TableCell align="right">
                            {assessmentReq.fulfilled ? "Yes" : "No"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          );
        }
      )}
    </Paper>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { id, openPorts, additionalRequirementResponses } = context.query;

  let parsedOpenPorts = null;
  let parsedAdditionalRequirementResponses = null;

  if (openPorts) {
    parsedOpenPorts = JSON.parse(openPorts as string);
  }

  if (additionalRequirementResponses) {
    parsedAdditionalRequirementResponses = JSON.parse(
      additionalRequirementResponses as string
    );
  }

  try {
    const response = await apiClient.get(`/assessments/${id}`);

    return {
      props: {
        assessment: response.data,
        openPorts: parsedOpenPorts,
        additionalRequirementResponses: parsedAdditionalRequirementResponses,
      },
    };
  } catch (error) {
    return { props: { error: `${error}` } };
  }
};

export default EvaluationPage;
