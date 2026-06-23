export const getSSLMode = (nodeEnv: string) => {
  const environment = {
    production: { rejectUnauthorized: false },
    staging: true,
    local: false,
  };
  return environment[nodeEnv as keyof typeof environment] || false;
};

export const getDBName = (nodeEnv: string): string => {
  const environment = {
    production: "",
    staging: "",
    local: "buzzy_finance_db_local",
    test: "buzzy_finance_db_test",
  };
  return environment[nodeEnv as keyof typeof environment];
};
