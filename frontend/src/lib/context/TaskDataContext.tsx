import React, { Dispatch, createContext, useContext, useReducer } from "react";
import { AutomatedRequirementType } from "../enums/enums";

type TaskData = {
  status: string;
  result: any;
  automatedRequirementType: AutomatedRequirementType;
  [key: string]: any;
};

type TasksDataState = {
  [key: string]: TaskData;
};

type SetTaskDataAction = {
  type: "SET_TASK_DATA";
  taskId: string;
  // requirementId: number;
  key: string;
  status: string;
  result: any;
  automatedRequirementType: AutomatedRequirementType;
};

type TaskDataProviderProps = {
  children: React.ReactNode;
};

type TasksDataAction = SetTaskDataAction;

const TasksDataContext = createContext<{
  tasksData: TasksDataState;
  dispatch: Dispatch<TasksDataAction>;
}>({ tasksData: {}, dispatch: () => undefined });

const tasksDataReducer = (state: TasksDataState, action: TasksDataAction) => {
  switch (action.type) {
    case "SET_TASK_DATA":
      const existingDataForType = state[action.automatedRequirementType] || {};
      return {
        ...state,
        [action.automatedRequirementType]: {
          ...existingDataForType,
          [action.key]: {
            taskId: action.taskId,
            status: action.status,
            result: action.result,
          },
        },
      };
    default:
      return state;
  }
};

export const TasksDataProvider = ({ children }: TaskDataProviderProps) => {
  const [tasksData, dispatch] = useReducer(tasksDataReducer, {});

  return (
    <TasksDataContext.Provider value={{ tasksData, dispatch }}>
      {children}
    </TasksDataContext.Provider>
  );
};

export const useTasksData = () => {
  const context = useContext(TasksDataContext);
  if (context === undefined) {
    throw new Error("useTasksData must be used within a TasksDataProvider");
  }
  return context;
};
