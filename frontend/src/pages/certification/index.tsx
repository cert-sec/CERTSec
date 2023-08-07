import {
  Box,
  Button,
  CircularProgress,
  Container,
  Grid,
  IconButton,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import React, { FormEvent, useState } from "react";
import apiClient from "@/lib/apiClient";
import { useRouter } from "next/router";
import { useCompany } from "@/lib/context/CompanyContext";
import InputAdornment from "@mui/material/InputAdornment";
import BusinessIcon from "@mui/icons-material/Business";
import {
  Add,
  Delete,
  DeveloperBoard,
  Store,
  Update,
  History,
  LocalMall,
} from "@mui/icons-material";
import RouterIcon from "@mui/icons-material/Router";
import LinkIcon from "@mui/icons-material/Link";
import { set } from "lodash";

type Product = {
  product: string;
  version: string;
  vendor: string;
};

const CompanyInformation = () => {
  const router = useRouter();
  const { setCompany } = useCompany();
  const [companyName, setCompanyName] = useState<string>("");
  const [ipAddresses, setIpAddresses] = useState<string[]>([""]);
  const [domainNames, setDomainNames] = useState<string[]>([""]);
  const [products, setProducts] = useState<Product[]>([
    { product: "", version: "", vendor: "" },
  ]);
  const [error, setError] = useState<string | null>(null);
  //   const [https_task_id, setHttpsTask_id] = useState<string | null>(null);
  //   const [vulners_task_id, setVulnersTask_id] = useState<string | null>(null);
  //   const [ping_task_id, setPingTask_id] = useState<string | null>(null);
  const [technology_vulnerability_task_id, setTechnologyVulnerabilityTaskId] =
    useState<string | null>(null);
  const [scan_ports_task_id, setScanPortsTaskId] = useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const addField = <T,>(
    setter: React.Dispatch<React.SetStateAction<T[]>>,
    initial: T
  ) => {
    setter((prev) => [...prev, initial]);
  };

  const removeField = <T,>(
    index: number,
    setter: React.Dispatch<React.SetStateAction<T[]>>
  ) => {
    setter((prev) => prev.filter((_, i) => i !== index));
  };

  const handleChange = <T,>(
    index: number,
    setter: React.Dispatch<React.SetStateAction<T[]>>,
    value: T
  ) => {
    setter((prev) => prev.map((item, i) => (i === index ? value : item)));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = {
      companyName,
      ipAddresses,
      domainNames,
      products,
    };
    console.log("Form Data submitted: ", formData);

    if (companyName.length === 0) {
      alert("Please enter your company name");
      setIsLoading(false);
      return;
    }

    try {
      const response = await apiClient.post("/companies/", {
        name: companyName,
      });
      console.log("Response from create company: ", response.data);
      setCompany(response.data);
    } catch (error: any) {
      if (error.response && error.response.status === 400) {
        setError(error.response.data.name);
      }
      console.log("Error creating company: ", error);
      setIsLoading(false);
      return;
    }

    try {
      const [
        httpsResponse,
        scanVulnersResponse,
        pingResponse,
        technologyVulnersResponse,
        scanPortsResponse,
      ] = await Promise.all([
        apiClient.post("/check-https/", {
          websites: domainNames,
        }),
        apiClient.post("/scan-vulners/ips", {
          ip_addresses: ipAddresses,
        }),
        apiClient.post("/ping/", {
          ip_addresses: ipAddresses,
        }),
        apiClient.post("/scan-vulners/technologies", {
          technologies: products,
        }),
        apiClient.post("/scan-ports/", {
          ip_addresses: ipAddresses,
        }),
      ]);

      const httpsTaskId = httpsResponse.data.task_id;
      const vulnersTaskId = scanVulnersResponse.data.task_id;
      const pingTaskId = pingResponse.data.task_id;
      const technologyVulnersTaskId = technologyVulnersResponse.data.task_id;
      const portsTaskId = scanPortsResponse.data.task_id;
      setIsLoading(false);

      router.push(
        {
          pathname: "/certification/technical-baseline",
          query: {
            httpsTaskId: httpsTaskId,
            vulnersTaskId: vulnersTaskId,
            pingTaskId: pingTaskId,
            technologyVulnersTaskId: technologyVulnersTaskId,
            portsTaskId: portsTaskId,
          },
        },
        "/certification/technical-baseline"
      );
    } catch (error: any) {
      console.log("Error creating background tasks: ", error);
      setIsLoading(false);
    }
  };

  const pollResult = async () => {
    try {
      console.log("scan_ports_task_id: ", scan_ports_task_id);
      const response = await apiClient.get(`/tasks/?id=${scan_ports_task_id}`);
      console.log("Response from poll result (scan ports): ", response.data);
      // console.log(
      //   "number of cves analyzed: ",
      //   Object.keys(response.data.result).length
      // );

      // console.log("vulners_task_id: ", vulners_task_id);
      // const response2 = await apiClient.get(`/tasks/?id=${vulners_task_id}`);
      // console.log("Response from poll result (https-check): ", response2.data);

      // console.log("ping_task_id: ", ping_task_id);
      // const response3 = await apiClient.get(`/tasks/?id=${ping_task_id}`);
      // console.log("Response from poll result (https-check): ", response3.data);
    } catch (error: any) {
      console.log("Error polling result: ", error);
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
        minHeight: "100vh",
      }}
    >
      <Paper
        elevation={3}
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-evenly",
          p: 3,
          m: 1,
          fontFamily: "Arial",
          borderRadius: "15px",
          bgcolor: "#f5f5f5",
          height: "100%",
          minHeight: "90vh",
          width: "100%",
          // maxWidth: "1200px",
        }}
      >
        <Box height="10vh" display="flex" alignItems="center">
          <Typography
            variant="h4"
            sx={{ fontWeight: "bold", color: "#333333" }}
          >
            Company Information
          </Typography>
        </Box>
        <Paper
          elevation={3}
          sx={{
            borderRadius: "10px",
            padding: 3,
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            minHeight: "80vh",
            maxWidth: "1200px",
          }}
        >
          <Typography
            variant="h6"
            sx={{ fontWeight: "600", color: "#555555", mb: 2 }}
          >
            Please enter your details
          </Typography>
          <Box
            component="form"
            width="100%"
            onSubmit={handleSubmit}
            minHeight="80%"
            display="flex"
            alignItems="center"
            flexDirection="column"
            sx={{ mb: 3 }}
          >
            <Box
              height="100%"
              width="100%"
              sx={{
                overflowY: "auto",
                "&::-webkit-scrollbar": {
                  display: "none",
                },
                px: 3,
              }}
            >
              <TextField
                variant="outlined"
                label="Company Name"
                fullWidth
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                error={!!error}
                helperText={error}
                sx={{
                  mb: 4,
                  mt: 2,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                  },
                  "& .Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#2457d6",
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <BusinessIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />

              <Typography variant="h6" sx={{ pb: 1.5 }}>
                IP Addresses:
              </Typography>
              {ipAddresses.map((ip, index) => (
                <Grid
                  container
                  spacing={2}
                  key={index}
                  alignItems="center"
                  sx={{ mb: 2.5 }}
                >
                  <Grid item xs={10}>
                    <TextField
                      label={`IP Address #${index + 1}`}
                      fullWidth
                      value={ip}
                      onChange={(e) =>
                        handleChange(index, setIpAddresses, e.target.value)
                      }
                      required
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: "8px",
                        },
                        "& .Mui-focused .MuiOutlinedInput-notchedOutline": {
                          borderColor: "#2457d6",
                        },
                      }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <RouterIcon color="action" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item>
                    <IconButton
                      onClick={() => removeField(index, setIpAddresses)}
                      sx={{
                        color: "#f44336",
                        "&:hover": { backgroundColor: "#fdecea" },
                      }}
                    >
                      <Delete />
                    </IconButton>
                  </Grid>
                </Grid>
              ))}
              <Button
                onClick={() => addField<string>(setIpAddresses, "")}
                style={{ backgroundColor: "#5db1e8" }}
                sx={{
                  color: "white",
                  backgroundColor: "#5db1e8",
                  padding: "10px 20px",
                  borderRadius: "8px",
                  marginRight: "10px",
                  marginBottom: "10px",
                  "&:hover": {
                    backgroundColor: "#3c8dbc",
                  },
                }}
              >
                Add IP Address
              </Button>

              <Typography variant="h6" sx={{ mt: 2, pb: 1.5 }}>
                Websites:
              </Typography>
              {domainNames.map((domainName, index) => (
                <Grid
                  container
                  spacing={2}
                  key={index}
                  alignItems="center"
                  sx={{ mb: 2.5 }}
                >
                  <Grid item xs={10}>
                    <TextField
                      fullWidth
                      value={domainName}
                      onChange={(e) =>
                        handleChange(index, setDomainNames, e.target.value)
                      }
                      label={`Website #${index + 1}`}
                      required
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: "8px",
                        },
                        "& .Mui-focused .MuiOutlinedInput-notchedOutline": {
                          borderColor: "#2457d6",
                        },
                      }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <LinkIcon color="action" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item>
                    <IconButton
                      onClick={() => removeField(index, setDomainNames)}
                      sx={{
                        color: "#f44336",
                        "&:hover": { backgroundColor: "#fdecea" },
                      }}
                    >
                      <Delete />
                    </IconButton>
                  </Grid>
                </Grid>
              ))}
              <Button
                onClick={() => addField<string>(setDomainNames, "")}
                style={{ backgroundColor: "#5db1e8" }}
                sx={{
                  color: "white",
                  backgroundColor: "#5db1e8",
                  padding: "10px 20px",
                  borderRadius: "8px",
                  marginRight: "10px",
                  marginBottom: "10px",
                  "&:hover": {
                    backgroundColor: "#3c8dbc",
                  },
                }}
              >
                Add Website
              </Button>

              <Typography variant="h6" sx={{ mt: 2, pb: 1.5 }}>
                Software / Technologies:
              </Typography>
              {products.map((product, index) => (
                <Grid
                  container
                  spacing={2}
                  key={index}
                  alignItems="center"
                  sx={{ mb: 1 }}
                >
                  <Grid item xs={5}>
                    <TextField
                      fullWidth
                      value={product.product}
                      onChange={(e) =>
                        handleChange(index, setProducts, {
                          ...product,
                          product: e.target.value,
                        })
                      }
                      variant="outlined"
                      label={`Software / Technology Name #${index + 1}`}
                      required
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: "8px",
                        },
                        "& .Mui-focused .MuiOutlinedInput-notchedOutline": {
                          borderColor: "#2457d6",
                        },
                      }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <DeveloperBoard color="action" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={5}>
                    <TextField
                      fullWidth
                      value={product.version}
                      onChange={(e) =>
                        handleChange(index, setProducts, {
                          ...product,
                          version: e.target.value,
                        })
                      }
                      label={`Version #${index + 1}`}
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: "8px",
                        },
                        "& .Mui-focused .MuiOutlinedInput-notchedOutline": {
                          borderColor: "#2457d6",
                        },
                      }}
                      variant="outlined"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <History color="action" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid
                    item
                    xs={5}
                    spacing={2}
                    container
                    alignItems="center"
                    sx={{ mb: 2 }}
                  >
                    <Grid item xs>
                      <TextField
                        fullWidth
                        value={product.vendor}
                        onChange={(e) =>
                          handleChange(index, setProducts, {
                            ...product,
                            vendor: e.target.value,
                          })
                        }
                        label={`Vendor #${index + 1}`}
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: "8px",
                          },
                          "& .Mui-focused .MuiOutlinedInput-notchedOutline": {
                            borderColor: "#2457d6",
                          },
                        }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <LocalMall color="action" />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                    <Grid item>
                      <IconButton
                        onClick={() => removeField(index, setProducts)}
                        sx={{
                          color: "#f44336",
                          "&:hover": { backgroundColor: "#fdecea" },
                        }}
                      >
                        <Delete />
                      </IconButton>
                    </Grid>
                  </Grid>
                </Grid>
              ))}
              <Button
                onClick={() =>
                  addField(setProducts, {
                    product: "",
                    version: "",
                    vendor: "",
                  })
                }
                style={{ backgroundColor: "#5db1e8" }}
                sx={{
                  color: "white",
                  backgroundColor: "#5db1e8",
                  padding: "10px 20px",
                  borderRadius: "8px",
                  marginRight: "10px",
                  marginBottom: "10px",
                  "&:hover": {
                    backgroundColor: "#3c8dbc",
                  },
                }}
                startIcon={<Add />}
              >
                Add Software / Technology
              </Button>
              {/* <Tooltip title="Add Software / Technology">
                <IconButton
                  color="primary"
                  onClick={() =>
                    addField(setProducts, {
                      product: "",
                      version: "",
                      vendor: "",
                    })
                  }
                  style={{ backgroundColor: "#5db1e8" }}
                  sx={{
                    color: "white",
                    backgroundColor: "#5db1e8",
                    padding: "10px 20px",
                    borderRadius: "8px",
                    marginRight: "10px",
                    marginBottom: "10px",
                    "&:hover": {
                      backgroundColor: "#3c8dbc",
                    },
                  }}
                >
                  <Add />
                </IconButton>
              </Tooltip> */}
            </Box>
            {/* <Button
              variant="contained"
              type="submit"
              color="primary"
              style={{ backgroundColor: "#1769aa" }}
              sx={{
                mt: 3,
                position: "relative",
                color: "white",
                padding: "10px 30px",
                "&:hover": {
                  backgroundColor: "#2457d6",
                },
              }}
              disabled={isLoading}
            >
              {isLoading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                "Start Assessment"
              )}
            </Button> */}
            <Button
              variant="contained"
              type="submit"
              color="primary"
              sx={{
                mt: 3,
                position: "relative",
                color: "white",
                padding: "10px 30px",
              }}
              style={{ backgroundColor: "#1769aa" }}
            >
              Start Assessment
            </Button>
          </Box>
          {/* </Box> */}
        </Paper>
        {/* <Button onClick={pollResult}>poll result</Button> */}
      </Paper>
    </Container>
  );
};

export default CompanyInformation;
