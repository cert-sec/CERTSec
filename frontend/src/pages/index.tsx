import apiClient from "@/lib/apiClient";
import { Certificate, useCertificate } from "@/lib/context/CertificatesContext";
import {
  Container,
  Paper,
  Typography,
  Button,
  Grid,
  Avatar,
  Box,
  Divider,
  Card,
  CardContent,
} from "@mui/material";
import { Build, MonetizationOn, Security } from "@mui/icons-material";
import { GetServerSideProps } from "next";
import Link from "next/link";
import { useEffect } from "react";
import Image from "next/image";

export default function Home({ certificates }: Record<string, Certificate>) {
  const { setCertificates } = useCertificate();
  const title = "Welcome to CERTSec";

  useEffect(() => {
    // @ts-ignore
    setCertificates(certificates);
  }, []);

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
          p: 3,
          m: 1,
          borderRadius: "15px",
          bgcolor: "#f5f5f5",
          height: "100%",
          minHeight: "95vh",
          width: "100%",
        }}
      >
        <Paper
          elevation={3}
          sx={{
            borderRadius: "10px",
            padding: 3,
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            minHeight: "90vh",
          }}
        >
          <Grid
            container
            justifyContent="center"
            alignItems="center"
            sx={{ mb: 5, mt: 3 }}
          >
            <Grid item sx={{ textAlign: "center" }}>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <Image
                  src="/uzh-logo.png"
                  alt="University of Zurich"
                  height={80}
                  width={80 * 3}
                />
                <Typography
                  variant="caption"
                  display="block"
                  align="center"
                  fontSize="15px"
                  sx={{ fontWeight: "bold" }}
                >
                  University of Zurich
                </Typography>
              </Box>
            </Grid>
            <Grid item sx={{ textAlign: "center", ml: 3 }}>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <Image
                  src="/csg-logo.png"
                  alt="Communication Systems Research Group"
                  height={95}
                  width={95}
                />
                <Typography
                  variant="caption"
                  display="block"
                  align="center"
                  fontSize="15px"
                  sx={{ fontWeight: "bold" }}
                >
                  Communication Systems Research Group
                </Typography>
              </Box>
            </Grid>
          </Grid>

          <Box
            sx={{
              textAlign: "center",
              mb: 3,
              pt: 3,
              maxWidth: "80%",
              width: "100%",
              mx: "auto",
            }}
          >
            <Typography
              variant="h3"
              sx={{ fontWeight: "bold", color: "#333333" }}
            >
              CERTSec
            </Typography>
            <Divider
              sx={{
                width: "50px",
                margin: "0 auto",
                my: 1,
                backgroundColor: "black",
              }}
            />
            <Typography variant="h4">
              A Cybersecurity Self-Assessment Tool, designed to help you
              evaluate and enhance your organization's cybersecurity posture.
            </Typography>
          </Box>

          <Grid container spacing={5} sx={{ width: "80%", mb: 3, mt: 1 }}>
            <Grid item xs={4}>
              <Card sx={{ p: 2, textAlign: "center", height: "100%" }}>
                <CardContent>
                  <Security
                    fontSize="large"
                    sx={{ fontSize: 60, color: "#4a90e2" }}
                  />
                  <Typography
                    variant="subtitle1"
                    gutterBottom
                    sx={{ fontWeight: "bold" }}
                  >
                    Technical Baseline
                  </Typography>
                  <Typography variant="body2">
                    Assesses the implementation and management of cybersecurity
                    measures and practices.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={4}>
              <Card sx={{ p: 2, textAlign: "center", height: "100%" }}>
                <CardContent>
                  <MonetizationOn
                    fontSize="large"
                    sx={{ fontSize: 60, color: "#4a90e2" }}
                  />
                  <Typography
                    variant="subtitle1"
                    gutterBottom
                    sx={{ fontWeight: "bold" }}
                  >
                    Cost-Aware Baseline
                  </Typography>
                  <Typography variant="body2">
                    Focuses on the financial and business-related aspects of
                    cybersecurity.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={4}>
              <Card sx={{ p: 2, textAlign: "center", height: "100%" }}>
                <CardContent>
                  <Build
                    fontSize="large"
                    sx={{ fontSize: 60, color: "#4a90e2" }}
                  />
                  <Typography
                    variant="subtitle1"
                    gutterBottom
                    sx={{ fontWeight: "bold" }}
                  >
                    Comprehensive Baseline
                  </Typography>
                  <Typography variant="body2">
                    Examines whether cybersecurity measures and practices align
                    with societal expectations and requirements
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Link href="/certification">
            <Button
              variant="contained"
              size="large"
              style={{ backgroundColor: "#2457d6" }}
              sx={{
                color: "white",
                mt: 2,
                mb: 4,
              }}
            >
              Get Started
            </Button>
          </Link>

          <Divider sx={{ width: "80%", mb: 4, mt: 3 }} />

          <Typography variant="subtitle2" align="center" sx={{ mb: 2 }}>
            Developer:{" "}
            <a
              href="https://www.linkedin.com/in/bulin-shaqiri-71071b183/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                textDecoration: "none",
                color: "#1e88e5",
                cursor: "pointer",
              }}
            >
              Bulin Shaqiri
            </a>{" "}
            | Project Manager:{" "}
            <a
              href="https://www.linkedin.com/search/results/all/?fetchDeterministicClustersOnly=true&heroEntityKey=urn%3Ali%3Afsd_profile%3AACoAACCFICgBOqSG2PnidBJoNqwvEGrkben9OH4&keywords=muriel%20figueredo%20franco&origin=RICH_QUERY_SUGGESTION&position=0&searchId=e5760940-4fa4-4fdb-ad94-44dcc0aaba9f&sid=I1u"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                textDecoration: "none",
                color: "#1e88e5",
                cursor: "pointer",
              }}
            >
              Dr. Muriel Figueredo Franco
            </a>{" "}
            | 2023
          </Typography>
        </Paper>
      </Paper>
    </Container>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const response = await apiClient.get("/certificates/");
  console.log("get certificates response: ", response.data);

  let certificates: Record<string, Certificate> = {};
  response.data.forEach((certificate: Certificate) => {
    switch (certificate.name) {
      case "Comprehensive Baseline":
        certificates["COB"] = { ...certificate };
        break;
      case "Cost-Aware Baseline":
        certificates["CAB"] = { ...certificate };
        break;
      case "Technical Baseline":
        certificates["TB"] = { ...certificate };
    }
  });

  return {
    props: {
      certificates,
    },
  };
};
