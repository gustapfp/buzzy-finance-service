const ENDPOINT_URL = `${process.env.BASE_URL}/api/v1/users`;

export const createUser = async (body: any) => {
  return await fetch(ENDPOINT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
};

export const getUserByUsername = async (username: string) => {
  return await fetch(`${ENDPOINT_URL}/${username}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
};
