import http from "k6/http";

export const options = {
  duration: "5s",
  vus: 10,
  summaryTrendStats: ["med", "p(99)"],
};

export default function () {
  const payload = JSON.stringify({ question: "hello" });

  const params = {
    headers: {
      'user-uuid': 'abc',
    },
  };

  http.post("http://localhost:7800/api/questions/cs-e4770", payload, params);
}