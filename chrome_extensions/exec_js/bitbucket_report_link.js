document
  .getElementById('bitbucket_report_link_1week')
  .addEventListener('click', async () => {
    await execInTab('1 week');
  });
document
  .getElementById('bitbucket_report_link_2weeks')
  .addEventListener('click', async () => {
    await execInTab('2 weeks');
  });

async function execInTab(mode) {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });
  if (tab) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (mode) => {
        // This code runs on the current page
        changeDates(mode);

        function changeDates(mode) {
          if (document.title !== 'Team Reports - Jira') return;

          // format 2025-03-15
          // including
          let startDate = '';
          // including
          let endDate = '';

          let dayMS = 24 * 60 * 60 * 1000;
          let now = new Date();

          switch (mode) {
            case '1 week': {
              let daysToPrevSunday = -now.getDay();
              let daysToCurrMonday = daysToPrevSunday + 1;
              let daysToNextSunday = daysToPrevSunday + 7;
              startDate = formatDate(now.getTime() + daysToCurrMonday * dayMS);
              endDate = formatDate(now.getTime() + daysToNextSunday * dayMS);
              break;
            }
            case '2 weeks': {
              let daysToPrevSunday = -now.getDay();
              let daysToPrevMonday = daysToPrevSunday - 6;
              let daysToNextSunday = daysToPrevSunday + 7;
              startDate = formatDate(now.getTime() + daysToPrevMonday * dayMS);
              endDate = formatDate(now.getTime() + daysToNextSunday * dayMS);
              break;
            }
          }

          console.log('startDate', startDate);
          console.log('endDate', endDate);

          let result =
            'https://virto-solar.atlassian.net/projects/' +
            'VS360?selectedItem=com.atlassian.plugins.atlassian-connect-plugin:com.gebsun.atlassian.reports__report#!/' +
            `?datem=useFromTo&from=${startDate}&groupBy=summary&jusers=_currentUser&period=days` +
            `&timeZone=user&to=${endDate}&wlFormat=hours`;

          window.location.href = result;
          window.location.reload();
        }

        function formatDate(ts) {
          const date = new Date(ts);
          return date.toISOString().split('T')[0];
        }
      },
      args: [mode],
    });
  }
}
