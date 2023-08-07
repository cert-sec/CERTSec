import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Tooltip,
  Checkbox,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import {
  Categories,
  Requirement,
  UserResponses,
} from "@/pages/certification/technical-baseline";
import { BACKGROUND_TASKS_STATUS } from "@/lib/utils/constants";
import CheckBoxes from "./CheckBoxes";
import InfoIcon from "@mui/icons-material/Info";
import { AutomatedRequirementType } from "@/lib/enums/enums";
import { set } from "lodash";
import { generateIdForOpenPort } from "@/lib/utils/utils";
import { ExpandMore } from "@mui/icons-material";

type CategoryTableProps = {
  category: Categories;
  handleUserResponseChange: (id: number, response: "yes" | "no") => void;
  userResponses: UserResponses;
  additionalRequirementResponses?: UserResponses;
  handleAdditionalRequirementResponseChange?: (
    id: number,
    response: "yes" | "no"
  ) => void;
  setOpenPorts?: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  openPorts?: Record<string, any>;
};

const CategoryTable = (props: CategoryTableProps) => {
  const {
    category,
    handleUserResponseChange,
    userResponses,
    openPorts,
    setOpenPorts,
    additionalRequirementResponses,
    handleAdditionalRequirementResponseChange,
  } = props;

  useEffect(() => {
    category?.requirements?.forEach((requirement: Requirement) => {
      if (
        requirement.status === BACKGROUND_TASKS_STATUS.SUCCESS ||
        (requirement.vulnerabilities !== undefined &&
          requirement.vulnerabilities.ip.status ===
            BACKGROUND_TASKS_STATUS.SUCCESS &&
          requirement.vulnerabilities.technology.status ===
            BACKGROUND_TASKS_STATUS.SUCCESS) ||
        (requirement.checks !== undefined &&
          requirement.checks.ping.status === BACKGROUND_TASKS_STATUS.SUCCESS &&
          requirement.checks.ports.status === BACKGROUND_TASKS_STATUS.SUCCESS)
      ) {
        const evaluationResult = evaluateAutomatedRequirement(requirement);
        if (evaluationResult) {
          handleUserResponseChange(requirement.id, evaluationResult);
        }
      }
    });
  }, [category.requirements, handleUserResponseChange]);

  const explanation = "Automated verification failed. Please verify manually.";

  const evaluateAutomatedRequirement = (requirement: Requirement) => {
    let verificationText = "Automated Verification Pending";

    if (!requirement.is_automated_requirement) {
      return;
    }

    switch (requirement.automated_requirement_type) {
      case AutomatedRequirementType.HTTPS_PROTOCOL_CHECKER:
        const unsecureConnections = Object.keys(requirement.results).reduce(
          (acc: Record<string, any>, domainName: string) => {
            const value = requirement.results[domainName];
            if (value.protocol === "http") {
              if (!acc[domainName]) {
                acc[domainName] = {};
              }
              acc[domainName] = value;
            }
            return acc;
          },
          {}
        );

        console.log("unsecureConnections: ", unsecureConnections);

        return Object.keys(unsecureConnections).length === 0 ? "yes" : "no";

      case AutomatedRequirementType.UNAUTHORIZED_ACCESS_CHECKER:
        let unauthorizedAccessFound = false;
        const unsecureNetworks = Object.keys(
          requirement.checks?.ping.results
        ).reduce((acc: Record<string, any>, ip: string) => {
          const value = requirement.checks?.ping.results[ip];
          if (value.connection_established === "True") {
            if (!acc[ip]) {
              acc[ip] = {};
            }
            acc[ip] = value;
          }
          return acc;
        }, {});
        unauthorizedAccessFound = Object.keys(unsecureNetworks).length > 0;

        let openPortsFound = false;
        const openPorts = Object.keys(requirement.checks?.ports.results).reduce(
          (acc: Record<string, any>, ip: string) => {
            const ports = requirement.checks?.ports.results[ip];
            const analyzedPorts = ports.filter(
              (port: any) => port.state === "open"
            );
            if (analyzedPorts.length > 0) {
              if (!acc[ip]) {
                acc[ip] = {};
              }
              acc[ip] = analyzedPorts;
            }
            return acc;
          },
          {}
        );
        setOpenPorts(openPorts);

        // requirement.checks?.ports.results.filter(
        //   (port: any) => port.status === "open"
        // );
        openPortsFound = Object.keys(openPorts).length > 0;

        console.log("unsecureNetworks: ", unsecureNetworks);

        return unauthorizedAccessFound || openPortsFound ? "no" : "yes";
      // return Object.keys(unsecureNetworks).length === 0 ? "yes" : "no";

      case AutomatedRequirementType.VULNERABILITY_CHECKER:
        console.log(
          "insine evaluateAutomatedRequirement - Vulnerability Checker"
        );

        let ipVulnerabilitiesFound = false;
        const ipVulnerabilities = Object.keys(
          requirement.vulnerabilities?.ip.results
        ).reduce((acc: Record<string, any>, ip: string) => {
          const services = requirement.vulnerabilities?.ip.results[ip];
          Object.keys(services).forEach((port) => {
            const serviceInfo = services[port];
            const vulnerabilities = serviceInfo["vulnerabilities"];
            if (vulnerabilities && Object.keys(vulnerabilities).length > 0) {
              if (!acc[ip]) {
                acc[ip] = {};
              }
              acc[ip][port] = serviceInfo;
            }
          });
          return acc;
        }, {});
        ipVulnerabilitiesFound = Object.keys(ipVulnerabilities).length > 0;
        console.log("filteredVulnerabilities: ", ipVulnerabilities);

        let technologyVulnerabilitiesFound = false;
        const technologyVulnerabilities =
          requirement.vulnerabilities?.technology.results.filter(
            (technology: any) =>
              Object.keys(technology.vulnerabilities).length > 0
          );
        console.log("technologyVulnerabilities: ", technologyVulnerabilities);
        technologyVulnerabilitiesFound = technologyVulnerabilities.length > 0;

        return ipVulnerabilitiesFound || technologyVulnerabilitiesFound
          ? "no"
          : "yes";
    }
  };

  console.log("category.requirements: ", category.requirements);
  console.log("openPorts: ", openPorts);

  return (
    <Box marginBottom={4} sx={{ width: "100%" }}>
      <Paper
        elevation={3}
        sx={{ borderRadius: "10px", padding: 2, marginBottom: 2 }}
      >
        <Box
          sx={{
            borderBottom: "1px solid #ccc",
            paddingBottom: 2,
            marginBottom: 2,
          }}
        >
          <Typography variant="h5" gutterBottom component="div">
            Category: {category.name}
          </Typography>
          <Typography variant="subtitle1" gutterBottom component="div">
            Goal: {category.description}
          </Typography>
        </Box>

        <TableContainer
          component={Paper}
          sx={{ borderRadius: "10px", maxHeight: 1000 }}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ pl: 2 }}>Requirements</TableCell>
                <TableCell align="right" style={{ width: "145px" }}>
                  Yes
                </TableCell>
                <TableCell align="right" style={{ width: "145px" }}>
                  No
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {category?.requirements?.map((requirement) => (
                <>
                  <TableRow key={requirement.id}>
                    <TableCell component="th" scope="row" sx={{ pl: 2 }}>
                      {requirement.description}
                      {/* TODO: adjust to new data structures */}
                      {((requirement.status &&
                        requirement.status ===
                          BACKGROUND_TASKS_STATUS.FAILURE) ||
                        (requirement.checks &&
                          requirement.checks.ping.status ===
                            BACKGROUND_TASKS_STATUS.FAILURE)) && (
                        <Tooltip title={explanation} placement="top">
                          <InfoIcon sx={{ marginLeft: "5px" }} />
                        </Tooltip>
                      )}
                    </TableCell>
                    {requirement.status ? (
                      <HttpsRequirementResponse
                        requirement={requirement}
                        userResponses={userResponses}
                        handleUserResponseChange={handleUserResponseChange}
                      />
                    ) : requirement.vulnerabilities ? (
                      <VulnerabilitiesRequirementResponse
                        requirement={requirement}
                        userResponses={userResponses}
                        handleUserResponseChange={handleUserResponseChange}
                      />
                    ) : requirement.checks ? (
                      <UnauthorizedAccesssRequirementResponse
                        requirement={requirement}
                        userResponses={userResponses}
                        handleUserResponseChange={handleUserResponseChange}
                        openPorts={openPorts}
                      />
                    ) : (
                      <CheckBoxes
                        userResponses={userResponses}
                        requirement={requirement}
                        handleUserResponseChange={handleUserResponseChange}
                      />
                    )}
                  </TableRow>
                  {requirement.checks &&
                    openPorts &&
                    Object.keys(openPorts).length > 0 &&
                    additionalRequirementResponses &&
                    handleAdditionalRequirementResponseChange && (
                      <AdditionalRequirements
                        requirement={requirement}
                        openPorts={openPorts}
                        additionalRequirementResponses={
                          additionalRequirementResponses
                        }
                        handleAdditionalRequirementResponseChange={
                          handleAdditionalRequirementResponseChange
                        }
                      />
                    )}
                </>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

type AdditonalRequirementProps = {
  requirement: Requirement;
  handleAdditionalRequirementResponseChange: (
    id: number,
    response: "yes" | "no"
  ) => void;
  additionalRequirementResponses: UserResponses;
  openPorts?: Record<string, any>;
};

const AdditionalRequirements = (props: AdditonalRequirementProps) => {
  const {
    requirement,
    additionalRequirementResponses,
    openPorts,
    handleAdditionalRequirementResponseChange,
  } = props;

  console.log("AdditionalRequirements - openPorts: ", openPorts);
  console.log(
    "AdditionalRequirements - additionalRequirementResponses: ",
    additionalRequirementResponses
  );

  return (
    <TableRow>
      <TableCell colSpan={3}>
        <Accordion sx={{ width: "100%", boxShadow: "none" }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="body2" component="div">
              There are open ports identified, please verify the following
              questions manually:
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ flexDirection: "column" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ pl: 2 }}>Additional Requirements</TableCell>
                  <TableCell align="right" style={{ width: "145px" }}>
                    Yes
                  </TableCell>
                  <TableCell align="right" style={{ width: "145px" }}>
                    No
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {openPorts &&
                  Object.keys(openPorts).map((ip) =>
                    openPorts[ip].map((port, index) => {
                      const id = generateIdForOpenPort(ip, port.portid);
                      return (
                        <TableRow key={index}>
                          <TableCell component="th" scope="row">
                            Do you have any measures implemented to prevent
                            unauthorized access using the{" "}
                            {port.service.name.toUpperCase()} protocol?
                            <Tooltip
                              title={`Port: ${port.portid}, IP Address: ${ip}`}
                              placement="top"
                            >
                              <InfoIcon sx={{ marginLeft: "5px" }} />
                            </Tooltip>
                          </TableCell>
                          <TableCell align="right">
                            <Checkbox
                              onChange={(e) =>
                                handleAdditionalRequirementResponseChange(
                                  id,
                                  e.target.checked ? "yes" : "no"
                                )
                              }
                              checked={
                                additionalRequirementResponses[id] === "yes"
                              }
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Checkbox
                              onChange={(e) =>
                                handleAdditionalRequirementResponseChange(
                                  id,
                                  e.target.checked ? "no" : "yes"
                                )
                              }
                              checked={
                                additionalRequirementResponses[id] === "no"
                              }
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
              </TableBody>
            </Table>
          </AccordionDetails>
        </Accordion>
      </TableCell>
    </TableRow>
  );
};

type RequirementResponseProps = {
  requirement: Requirement;
  handleUserResponseChange: (id: number, response: "yes" | "no") => void;
  userResponses: UserResponses;
  openPorts?: Record<string, any>;
};

const UnauthorizedAccesssRequirementResponse = (
  props: RequirementResponseProps
) => {
  const { requirement, handleUserResponseChange, userResponses, openPorts } =
    props;

  console.log(
    "UnauthorizedAccesssRequirementResponse - openPorts: ",
    openPorts
  );

  return (
    <>
      {requirement.checks?.ping.status === BACKGROUND_TASKS_STATUS.PENDING ||
      requirement.checks?.ports.status === BACKGROUND_TASKS_STATUS.PENDING ? (
        <TableCell align="left" colSpan={2}>
          <Typography
            variant="body2"
            display="flex"
            sx={{ justifyContent: "center" }}
          >
            Ongoing verification...
          </Typography>
        </TableCell>
      ) : requirement.checks?.ping.status === BACKGROUND_TASKS_STATUS.SUCCESS &&
        requirement.checks.ports.status === BACKGROUND_TASKS_STATUS.SUCCESS &&
        Object.keys(openPorts).length === 0 ? (
        <TableCell align="right" colSpan={2}>
          {userResponses[requirement.id] === "yes" ? (
            <Typography variant="body2">
              Yes - based on automated verification
            </Typography>
          ) : (
            <Typography variant="body2">
              No - based on automated verification
            </Typography>
          )}
        </TableCell>
      ) : requirement.checks?.ping.status === BACKGROUND_TASKS_STATUS.SUCCESS &&
        requirement.checks.ports.status === BACKGROUND_TASKS_STATUS.SUCCESS &&
        openPorts &&
        Object.keys(openPorts).length > 0 &&
        Object.keys(openPorts).length > 0 ? (
        <TableCell align="center" colSpan={2}>
          <Typography variant="body2">
            Final verification of this requirement is done once additional
            questions are answered.
          </Typography>
        </TableCell>
      ) : (
        <CheckBoxes
          userResponses={userResponses}
          requirement={requirement}
          handleUserResponseChange={handleUserResponseChange}
        />
      )}
    </>
  );
};

const VulnerabilitiesRequirementResponse = (
  props: RequirementResponseProps
) => {
  const { requirement, handleUserResponseChange, userResponses } = props;

  return (
    <>
      {requirement.vulnerabilities?.ip.status ===
        BACKGROUND_TASKS_STATUS.PENDING ||
      requirement.vulnerabilities?.technology.status ===
        BACKGROUND_TASKS_STATUS.PENDING ? (
        <TableCell align="left" colSpan={2}>
          <Typography
            variant="body2"
            display="flex"
            sx={{ justifyContent: "center" }}
          >
            Ongoing verification...
          </Typography>
        </TableCell>
      ) : requirement.vulnerabilities?.ip.status ===
          BACKGROUND_TASKS_STATUS.SUCCESS &&
        requirement.vulnerabilities?.technology.status ===
          BACKGROUND_TASKS_STATUS.SUCCESS ? (
        <TableCell align="right" colSpan={2}>
          {userResponses[requirement.id] === "yes" ? (
            <Typography variant="body2">
              Yes - based on automated verification
            </Typography>
          ) : (
            <Typography variant="body2">
              No - based on automated verification
            </Typography>
          )}
        </TableCell>
      ) : (
        <CheckBoxes
          userResponses={userResponses}
          requirement={requirement}
          handleUserResponseChange={handleUserResponseChange}
        />
      )}
    </>
  );
};

const HttpsRequirementResponse = (props: RequirementResponseProps) => {
  const { requirement, handleUserResponseChange, userResponses } = props;

  return (
    <>
      {requirement.status === BACKGROUND_TASKS_STATUS.PENDING ? (
        <TableCell align="left" colSpan={2}>
          <Typography
            variant="body2"
            display="flex"
            sx={{ justifyContent: "center" }}
          >
            Ongoing verification...
          </Typography>
        </TableCell>
      ) : requirement.status === BACKGROUND_TASKS_STATUS.SUCCESS ? (
        <TableCell align="right" colSpan={2}>
          {userResponses[requirement.id] === "yes" ? (
            <Typography variant="body2">
              Yes - based on automated verification
            </Typography>
          ) : (
            <Typography variant="body2">
              No - based on automated verification
            </Typography>
          )}
        </TableCell>
      ) : (
        <CheckBoxes
          userResponses={userResponses}
          requirement={requirement}
          handleUserResponseChange={handleUserResponseChange}
        />
      )}
    </>
  );
};

export default CategoryTable;
