#Repositório AulaGit

Este repositório foi criado com finalidade didática proposta pelo exercício prático do módulo de Git do curso **Trilhando o caminho com PHP**. 
Curso ofertado pela escola **[School Of Net](http://www.schoolofnet.com/)**

##**Passo a passo para a criação do repositório local e no GitHub.**

01 - Criamos o repositório no GitHub e capturamos a url do repositório

02 - Clonamos o repositório criado no computador, "repositório local"
    $ git clone git@github.com:falcaotech/aulagit.git

03 - Navegando até a pasta onde será criada a pasta do repositório master local
    $ cd d:/sites/aulagit

04 - Criando o arquivo README.md
    $ touch README.md

05 - Editando o arquivo README.md descrevendo todas as etapas de criação do repositório no GitHub e local.
    $ vim README.md

06 - Salvando e fechando o arquivo README.md
    $ :wq

07 - Verificando o status
    $ git status

08 - Fazendo o primeiro commit
    $ git add .

09 - Commitando os arquivos do repositório
    $ git commit -m "commit inicial"

10 - Enviando os arquivos para o repositório no GitHub
    $ git push --all