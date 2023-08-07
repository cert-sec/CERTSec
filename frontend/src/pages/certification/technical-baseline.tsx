import CategoryTable from "@/components/CategoryTable";
import apiClient from "@/lib/apiClient";
import { useCertificate } from "@/lib/context/CertificatesContext";
import { useCompany } from "@/lib/context/CompanyContext";
import { useTasksData } from "@/lib/context/TaskDataContext";
import { AutomatedRequirementType, Categories } from "@/lib/enums/enums";
import { CERTIFICATES, BACKGROUND_TASKS_STATUS } from "@/lib/utils/constants";
import { Box, Button, Container, Paper, Typography } from "@mui/material";
import { set } from "lodash";
import { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";
import { useQuery } from "react-query";
import CircularProgress from "@mui/material/CircularProgress";

type TaskData = {
  status: string;
  result: any;
};

export type Requirement = {
  id: number;
  description: string;
  category: number | Categories;
  status?: "PENDING" | "SUCCESS" | "FAILURE";
  results?: any;
  is_automated_requirement?: boolean;
  automated_requirement_type?: AutomatedRequirementType;
  vulnerabilities?: Record<string, any>;
  checks?: Record<string, any>;
};

export type Category = {
  id: number;
  name: string;
  description: string;
  requirements?: Requirement[];
};

type Props = {
  categories: Category[] | null;
  httpsTaskData: TaskData | null;
  vulnersTaskData: TaskData | null;
  technologyVulnersTaskData: TaskData | null;
  pingTaskData: TaskData | null;
  portsTaskData: TaskData | null;
  error?: string;
};

type TasksStatusProps = {
  httpsTaskId: string;
  vulnersTaskId: string;
  pingTaskId: string;
  technologyVulnersTaskId: string;
  portsTaskId: string;
};

export type UserResponses = {
  [key: number]: "yes" | "no";
};

const fetchBackgroundTasksStatus = async (props: TasksStatusProps) => {
  const {
    httpsTaskId,
    vulnersTaskId,
    pingTaskId,
    technologyVulnersTaskId,
    portsTaskId,
  } = props;

  const [
    httpsTaskData,
    vulnersTaskData,
    pingTaskData,
    technologyVulnersTaskData,
    portsTaskData,
  ] = await Promise.all([
    apiClient.get(`tasks/?id=${httpsTaskId}`),
    apiClient.get(`tasks/?id=${vulnersTaskId}`),
    apiClient.get(`tasks/?id=${pingTaskId}`),
    apiClient.get(`tasks/?id=${technologyVulnersTaskId}`),
    apiClient.get(`tasks/?id=${portsTaskId}`),
  ]);

  return {
    httpsTaskData: httpsTaskData.data,
    vulnersTaskData: vulnersTaskData.data,
    pingTaskData: pingTaskData.data,
    technologyVulnersTaskData: technologyVulnersTaskData.data,
    portsTaskData: portsTaskData.data,
  };
};

const TechnicalBaseline: React.FC<Props> = ({
  categories,
  httpsTaskData,
  vulnersTaskData,
  pingTaskData,
  technologyVulnersTaskData,
  portsTaskData,
}) => {
  const router = useRouter();
  const { certificates } = useCertificate();
  const { company } = useCompany();
  const { dispatch } = useTasksData();
  const {
    httpsTaskId,
    vulnersTaskId,
    pingTaskId,
    technologyVulnersTaskId,
    portsTaskId,
  } = router.query;
  const [httpsTaskResponse, setHttpsTaskResponse] =
    useState<any>(httpsTaskData);
  const [vulnersTaskResponse, setVulnersTaskResponse] =
    useState<any>(vulnersTaskData);
  const [pingTaskResponse, setPingTaskResponse] = useState<any>(pingTaskData);
  const [technologyVulnersTaskResponse, setTechnologyVulnersTaskResponse] =
    useState<any>(technologyVulnersTaskData);
  const [portsTaskResponse, setPortsTaskResponse] =
    useState<any>(portsTaskData);
  const [certificateCategories, setCertificateCategories] = useState<
    Category[] | null
  >(categories);

  const [userResponses, setUserResponses] = useState<UserResponses>({});
  const [additionalRequirementResponses, setAdditionalRequirementResponses] =
    useState<UserResponses>({});
  const [openPorts, setOpenPorts] = useState<Record<string, any>>({});
  const [numberOfOpenPorts, setNumberOfOpenPorts] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  console.log("numberOfOpenPorts: ", numberOfOpenPorts);

  const handleUserResponseChange = useCallback(
    (id: number, response: "yes" | "no") => {
      setUserResponses((prevResponses) => ({
        ...prevResponses,
        [id]: response,
      }));
    },
    []
  );

  const handleAdditionalRequirementResponseChange = useCallback(
    (id: number, response: "yes" | "no") => {
      setAdditionalRequirementResponses((prevResponses) => ({
        ...prevResponses,
        [id]: response,
      }));
    },
    []
  );

  console.log("userResponses: ", userResponses);
  console.log(
    "additionalRequirementResponses: ",
    additionalRequirementResponses
  );

  const hasTaskFinished = (status: string) => {
    return (
      status === BACKGROUND_TASKS_STATUS.SUCCESS ||
      status === BACKGROUND_TASKS_STATUS.FAILURE
    );
  };

  // poll status of background tasks every 5 seconds until all have finished
  const { data } = useQuery(
    [
      "backgroundTasksStatus",
      httpsTaskId,
      vulnersTaskId,
      pingTaskId,
      technologyVulnersTaskId,
      portsTaskId,
    ],
    (context) =>
      fetchBackgroundTasksStatus({
        httpsTaskId: context.queryKey[1] as string,
        vulnersTaskId: context.queryKey[2] as string,
        pingTaskId: context.queryKey[3] as string,
        technologyVulnersTaskId: context.queryKey[4] as string,
        portsTaskId: context.queryKey[5] as string,
      }),
    {
      refetchInterval: (data) =>
        (hasTaskFinished(httpsTaskResponse.status) &&
          hasTaskFinished(vulnersTaskResponse.status) &&
          hasTaskFinished(pingTaskResponse.status) &&
          hasTaskFinished(technologyVulnersTaskResponse.status) &&
          hasTaskFinished(portsTaskResponse.status)) ||
        (data &&
          hasTaskFinished(data.httpsTaskData.status) &&
          hasTaskFinished(data.pingTaskData.status) &&
          hasTaskFinished(data.vulnersTaskData.status) &&
          hasTaskFinished(data.technologyVulnersTaskData.status) &&
          hasTaskFinished(data.portsTaskData.status))
          ? false
          : 5000,
    }
  );

  console.log("data: ", data);
  useEffect(() => {
    if (data) {
      setHttpsTaskResponse(data.httpsTaskData);
      setVulnersTaskResponse(data.vulnersTaskData);
      setPingTaskResponse(data.pingTaskData);
      setTechnologyVulnersTaskResponse(data.technologyVulnersTaskData);
      setPortsTaskResponse(data.portsTaskData);

      dispatch({
        type: "SET_TASK_DATA",
        taskId: httpsTaskId as string,
        automatedRequirementType:
          AutomatedRequirementType.HTTPS_PROTOCOL_CHECKER,
        // requirementId: 4,
        status: data.httpsTaskData.status,
        result: data.httpsTaskData.result,
        key: "httpsCheck",
      });

      dispatch({
        type: "SET_TASK_DATA",
        taskId: vulnersTaskId as string,
        // requirementId: 8,
        automatedRequirementType:
          AutomatedRequirementType.VULNERABILITY_CHECKER,
        status: data.vulnersTaskData.status,
        result: data.vulnersTaskData.result,
        key: "ipVulnerabilities",
      });

      dispatch({
        type: "SET_TASK_DATA",
        taskId: pingTaskId as string,
        // requirementId: 5,
        automatedRequirementType:
          AutomatedRequirementType.UNAUTHORIZED_ACCESS_CHECKER,
        status: data.pingTaskData.status,
        result: data.pingTaskData.result,
        key: "pingCheck",
      });

      dispatch({
        type: "SET_TASK_DATA",
        taskId: portsTaskId as string,
        // requirementId: 5,
        automatedRequirementType:
          AutomatedRequirementType.UNAUTHORIZED_ACCESS_CHECKER,
        status: data.portsTaskData.status,
        result: data.portsTaskData.result,
        key: "portScan",
      });

      dispatch({
        type: "SET_TASK_DATA",
        taskId: vulnersTaskId as string,
        // requirementId: 8,
        automatedRequirementType:
          AutomatedRequirementType.VULNERABILITY_CHECKER,
        status: data.technologyVulnersTaskData.status,
        result: data.technologyVulnersTaskData.result,
        key: "technologyVulnerabilities",
      });

      // extend automated requirements with status and results from background tasks
      setCertificateCategories((prevCategories) => {
        if (!prevCategories) return null;

        return prevCategories?.map((category) => {
          if (category.name === Categories.PROTECT) {
            console.log("protect category requirements", category.requirements);
            return {
              ...category,
              requirements: category?.requirements?.map((requirement) => {
                if (requirement.is_automated_requirement) {
                  if (
                    requirement.automated_requirement_type ===
                    AutomatedRequirementType.HTTPS_PROTOCOL_CHECKER
                  ) {
                    return {
                      ...requirement,
                      status: data.httpsTaskData.status,
                      results: data.httpsTaskData.result,
                    };
                  }

                  if (
                    requirement.automated_requirement_type ===
                    AutomatedRequirementType.UNAUTHORIZED_ACCESS_CHECKER
                  ) {
                    return {
                      ...requirement,
                      checks: {
                        ping: {
                          status: data.pingTaskData.status,
                          results: data.pingTaskData.result,
                        },
                        ports: {
                          status: data.portsTaskData.status,
                          results: data.portsTaskData.result,
                        },
                      },
                    };
                  }

                  if (
                    requirement.automated_requirement_type ===
                    AutomatedRequirementType.VULNERABILITY_CHECKER
                  ) {
                    return {
                      ...requirement,
                      vulnerabilities: {
                        ip: {
                          status: data.vulnersTaskData.status,
                          results: data.vulnersTaskData.result,
                        },
                        technology: {
                          status: data.technologyVulnersTaskData.status,
                          results: data.technologyVulnersTaskData.result,
                        },
                      },
                    };
                  }
                }
                return requirement;
              }),
            };
          }
          return category;
        });
      });
    }
  }, [data]);

  useEffect(() => {
    const count = Object.values(openPorts).reduce(
      (total, portsArray) => total + portsArray.length,
      0
    );
    setNumberOfOpenPorts(count);
  }, [openPorts]);

  //   console.log("https_task_id", httpsTaskId);
  //   console.log("vulners_task_id", vulnersTaskId);
  //   console.log("ping_task_id", pingTaskId);

  //   console.log("data: ", data);
  console.log("TB certificateCategories", certificateCategories);

  console.log("certificates: ", certificates);

  const handleEvaluateResponses = async () => {
    try {
      // if user responds with no to any additional requirement, then the whole requirement 6,
      //i.e., "Is your network protected against unauthorized access from external sources by
      // using e.g., firewalls or routers?", is considered as failed
      if (
        userResponses[6] === "yes" &&
        additionalRequirementResponses &&
        Object.values(additionalRequirementResponses).includes("no")
      ) {
        userResponses[6] = "no";
      }

      const input = {
        certificate_id: certificates?.TB.id,
        company_id: company?.id,
        responses: userResponses,
      };

      console.log("input: ", input);
      setIsSubmitting(true);
      const response = await apiClient
        .post("/assessments/", {
          certificate_id: certificates?.TB.id,
          company_id: company?.id,
          user_responses: userResponses,
        })
        .catch((error) => {
          console.log(
            "Something went wrong when creating an assessment: ",
            error
          );
          setIsSubmitting(false);
        });
      setIsSubmitting(false);

      console.log("evaluateResponses response: ", response.data);
      router.push(
        {
          pathname: `/evaluation/${response.data.assessment_id}`,
          query: {
            openPorts: JSON.stringify(openPorts),
            additionalRequirementResponses: JSON.stringify(
              additionalRequirementResponses
            ),
          },
        },
        `/evaluation/${response.data.assessment_id}`
      );
    } catch (error) {
      console.error("Error evaluating responses: ", error);
    }
  };

  return (
    <Container
      component="main"
      maxWidth={false}
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Paper
        elevation={3}
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          p: 3,
          m: 3,
          fontFamily: "Arial",
          borderRadius: "15px",
          bgcolor: "#f5f5f5",
          height: "100%",
          width: "100%",
        }}
      >
        <Box
          sx={{
            borderBottom: "1px solid #ccc",
            pb: 2,
            mb: 3,
          }}
        >
          <Box display="flex" sx={{ pl: 3 }}>
            <Typography
              variant="h4"
              gutterBottom
              component="div"
              sx={{
                pr: 2,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              Technical Baseline Certification
            </Typography>
          </Box>
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            width="100%"
            p={3}
          >
            {certificateCategories?.map((category) => (
              <CategoryTable
                key={category.id}
                category={category}
                userResponses={userResponses}
                handleUserResponseChange={handleUserResponseChange}
                additionalRequirementResponses={additionalRequirementResponses}
                handleAdditionalRequirementResponseChange={
                  handleAdditionalRequirementResponseChange
                }
                openPorts={openPorts}
                setOpenPorts={setOpenPorts}
              />
            ))}
          </Box>
        </Box>
        <Button
          variant="contained"
          type="submit"
          color="primary"
          sx={{ mt: 3, color: "white" }}
          style={{ backgroundColor: "#2457d6" }}
          disabled={
            Object.keys(userResponses).length +
              Object.keys(additionalRequirementResponses).length !==
            23 + numberOfOpenPorts
          }
          onClick={handleEvaluateResponses}
        >
          Evaluate
          {/* {isSubmitting ? (
            <CircularProgress
              size={24}
              sx={{
                position: "absolute",
                top: "50%",
                left: "50%",
                marginTop: "-12px",
                marginLeft: "-12px",
              }}
            />
          ) : (
            "Evaluate"
          )} */}
        </Button>
      </Paper>
    </Container>
  );
};

export default TechnicalBaseline;

export const getServerSideProps: GetServerSideProps<Props> = async (
  context
) => {
  const {
    httpsTaskId,
    vulnersTaskId,
    pingTaskId,
    technologyVulnersTaskId,
    portsTaskId,
  } = context.query;

  try {
    const [
      httpsTaskData,
      vulnersTaskData,
      pingTaskData,
      technologyVulnersTaskData,
      portsTaskData,
      categories,
    ] = await Promise.all([
      apiClient.get(`tasks/?id=${httpsTaskId}`),
      apiClient.get(`tasks/?id=${vulnersTaskId}`),
      apiClient.get(`tasks/?id=${pingTaskId}`),
      apiClient.get(`tasks/?id=${technologyVulnersTaskId}`),
      apiClient.get(`tasks/?id=${portsTaskId}`),
      apiClient.get(`categories/?type=${CERTIFICATES.TECHNICAL_BASELINE}`),
    ]);

    return {
      props: {
        categories: categories.data,
        httpsTaskData: httpsTaskData.data,
        vulnersTaskData: vulnersTaskData.data,
        pingTaskData: pingTaskData.data,
        technologyVulnersTaskData: technologyVulnersTaskData.data,
        portsTaskData: portsTaskData.data,
      },
    };
  } catch (error) {
    console.error("Error fetching data in getServerSideProps", error);

    return {
      props: {
        error: "Failed to fetch data",
        categories: null,
        httpsTaskData: null,
        vulnersTaskData: null,
        pingTaskData: null,
        portsTaskData: null,
      },
    };
  }
};
