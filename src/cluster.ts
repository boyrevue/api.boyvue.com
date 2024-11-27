import * as os from 'os';

const cluster = require('cluster');

// What is more you should consider type cluster.schedulingPolicy = cluster.SCHED_RR;
// if you running your app on windows. More info at https://wanago.io/2019/04/29/node-js-typescript-power-of-many-processes-cluster/ "Scheduling policy" section
cluster.schedulingPolicy = cluster.SCHED_RR;

export class Cluster {
  static register(workers: number, callback: Function): void {
    let workerNumbers = workers;

    if (cluster.isPrimary) {
      // eslint-disable-next-line no-console
      console.log(`Master server started on ${process.pid}`);

      // ensure workers exit cleanly
      process.on('SIGINT', () => {
        // eslint-disable-next-line no-console
        console.log('Cluster shutting down...');
        // eslint-disable-next-line no-restricted-syntax, guard-for-in
        for (const id in cluster.workers) {
          cluster.workers[id].kill();
        }
        // exit the master process
        process.exit(0);
      });

      const cpus = os.cpus().length;
      if (workerNumbers > cpus) { workerNumbers = cpus; }

      for (let i = 0; i < workerNumbers; i += 1) {
        cluster.fork();
      }
      cluster.on('online', (worker) => {
        // eslint-disable-next-line no-console
        console.log('Worker %s is online', worker.process.pid);
      });
      cluster.on('exit', (worker) => {
        // eslint-disable-next-line no-console
        console.log(`Worker ${worker.process.pid} died. Restarting`);
        cluster.fork();
      });
    } else {
      callback();
    }
  }
}
