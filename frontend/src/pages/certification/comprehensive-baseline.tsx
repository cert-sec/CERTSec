import { useCallback, useState } from "react";
import { Category, UserResponses } from "./technical-baseline";
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Typography,
} from "@mui/material";
import CategoryTable from "@/components/CategoryTable";
import apiClient from "@/lib/apiClient";
import { CERTIFICATES } from "@/lib/utils/constants";
import { useCertificate } from "@/lib/context/CertificatesContext";
import { useCompany } from "@/lib/context/CompanyContext";
import { useRouter } from "next/router";

type Props = {
  categories: Category[];
};

const CostAwareBaseline: React.FC<Props> = ({ categories }) => {
  const [certificateCategories, setCertificateCategories] =
    useState(categories);
  const [userResponses, setUserResponses] = useState<UserResponses>({});
  const { certificates } = useCertificate();
  const { company } = useCompany();
  const router = useRouter();

  console.log(
    "comprehensive-baseline: certificateCategories",
    certificateCategories
  );
  console.log("comprehensive-baseline: userResponses", userResponses);
  console.log("comprehensive-baseline: certificates", certificates);
  console.log("comprehensive-baseline: company", company);
  const handleUserResponseChange = useCallback(
    (id: number, response: "yes" | "no") => {
      setUserResponses((prevResponses) => ({
        ...prevResponses,
        [id]: response,
      }));
    },
    []
  );

  const handleEvaluateResponses = async () => {
    try {
      const response = await apiClient.post("/assessments/", {
        certificate_id: certificates?.COB.id,
        company_id: company?.id,
        user_responses: userResponses,
      });

      router.push({
        pathname: `/evaluation/${response.data.assessment_id}`,
      });
    } catch (error) {
      console.log("Error evaluating responses: ", error);
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
              Comprehensive Baseline Certification
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
          disabled={Object.keys(userResponses).length !== 11}
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

export const getServerSideProps = async () => {
  try {
    const response = await apiClient.get(
      `categories/?type=${CERTIFICATES.COMPREHENSIVE_BASELINE}`
    );
    const categories = response.data;

    return {
      props: {
        categories,
      },
    };
  } catch (error) {
    console.log("Error fetching COB categories: ", error);
    return {
      props: {
        error: "Failed fetching COB categories",
        categories: null,
      },
    };
  }
};

export default CostAwareBaseline;
