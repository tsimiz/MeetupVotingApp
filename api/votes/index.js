const { TableClient } = require("@azure/data-tables");

const TABLE_NAME = "MeetupVotes";
const PARTITION_KEY = "topics";
const TOPICS = [
  { id: "ai-copilot", label: "AI & Copilot" },
  { id: "cloud-native", label: "Cloud-native apps" },
  { id: "azure-costs", label: "Azure costs" },
  { id: "security", label: "Security" },
  { id: "developer-experience", label: "Developer experience" },
];

function getTableClient() {
  const connectionString = process.env.VOTES_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error("The VOTES_STORAGE_CONNECTION_STRING setting is missing.");
  }
  return TableClient.fromConnectionString(connectionString, TABLE_NAME);
}

async function getVotes(tableClient) {
  const votesById = new Map();
  for await (const entity of tableClient.listEntities({
    queryOptions: { filter: `PartitionKey eq '${PARTITION_KEY}'` },
  })) {
    votesById.set(entity.rowKey, Number(entity.votes) || 0);
  }

  const voteTopics = TOPICS.map((topic) => ({
    ...topic,
    votes: votesById.get(topic.id) || 0,
  }));
  return {
    topics: voteTopics,
    totalVotes: voteTopics.reduce((total, topic) => total + topic.votes, 0),
  };
}

async function incrementVote(tableClient, topicId) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    let entity;
    try {
      entity = await tableClient.getEntity(PARTITION_KEY, topicId);
    } catch (error) {
      if (error.statusCode !== 404) throw error;
      try {
        await tableClient.createEntity({
          partitionKey: PARTITION_KEY,
          rowKey: topicId,
          votes: 1,
        });
        return;
      } catch (createError) {
        if (createError.statusCode === 409) continue;
        throw createError;
      }
    }

    try {
      await tableClient.updateEntity(
        { ...entity, votes: (Number(entity.votes) || 0) + 1 },
        "Merge",
        { etag: entity.etag },
      );
      return;
    } catch (error) {
      if (error.statusCode !== 412) throw error;
    }
  }
  const error = new Error("Vote could not be saved due to concurrent updates.");
  error.statusCode = 409;
  throw error;
}

module.exports = async function (context, req) {
  try {
    const tableClient = getTableClient();
    await tableClient.createTable();

    if (req.method === "POST") {
      const topicId = req.body && req.body.topicId;
      if (!TOPICS.some((topic) => topic.id === topicId)) {
        context.res = { status: 400, body: { error: "Choose a valid topic." } };
        return;
      }
      await incrementVote(tableClient, topicId);
    }

    context.res = {
      status: 200,
      headers: { "Cache-Control": "no-store" },
      body: await getVotes(tableClient),
    };
  } catch (error) {
    context.log.error("Unable to load or save meetup votes.", error);
    context.res = {
      status: error.statusCode === 409 ? 409 : 503,
      body: { error: "The poll is temporarily unavailable." },
    };
  }
};
