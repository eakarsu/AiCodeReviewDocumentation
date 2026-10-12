import FormattedAIReport from './FormattedAIReport';

function AIResultDisplay({ content, title = 'AI Analysis' }) {
  if (content === null || content === undefined || content === '') return null;
  return <FormattedAIReport response={content} title={title} />;
}

export default AIResultDisplay;
